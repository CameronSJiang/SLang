/**
 * Speaks dubbed cues in sync with a video. Lowers the original audio while
 * speaking, speeds lines up to fit, and briefly pauses the video when a line
 * still overruns into the next one (or its audio isn't generated yet). The
 * voice itself is a pluggable Speaker: the browser's speechSynthesis by
 * default, or on-device Kokoro (see kokoroSpeaker.ts).
 */
import { findCueIndex } from '../../core/cueIndex';
import { fitRate, pickVoice } from '../../core/dub';
import type { Cue } from '../../core/types';

/** Original audio level while the dub voice speaks, relative to the user's volume. */
export const DUCK_LEVEL = 0.15;
/** Don't start a line we reach more than this late (e.g. after seeking into it). */
const MAX_LATE_S = 1.0;
/** How long to hold the video waiting for a line's audio before skipping it. */
const READY_TIMEOUT_MS = 8000;
/** Cues to prepare ahead of the playhead. */
const LOOKAHEAD = 4;

export type DubIssue = 'no-voice' | 'blocked' | 'preparing';

export interface Utterance {
  stop(): void;
}

export interface Speaker {
  /**
   * Start saying `cue`; call `onEnd` exactly once when it finishes or fails.
   * `seconds` is the time available at the video's current speed.
   */
  say(
    cue: Cue,
    seconds: number,
    videoRate: number,
    onEnd: () => void,
  ): Utterance | 'not-ready' | 'no-voice';
  /** These cues are coming up: start preparing them. */
  upcoming?(cues: Cue[]): void;
  /** Resolves when `cue` can be said (after 'not-ready'). */
  whenReady?(cue: Cue): Promise<void>;
  dispose?(): void;
}

/** The browser's built-in voices. */
export class SystemSpeaker implements Speaker {
  private readonly synth = globalThis.speechSynthesis;
  private current: SpeechSynthesisUtterance | null = null;

  constructor(
    private readonly lang: string,
    private readonly voiceURI: string | null,
    private readonly onIssue?: (i: DubIssue | null) => void,
  ) {}

  say(cue: Cue, seconds: number, videoRate: number, onEnd: () => void) {
    const synth = this.synth;
    const voice = synth && pickVoice(synth.getVoices(), this.lang, this.voiceURI);
    if (!synth || !voice) return 'no-voice' as const;
    const u = new SpeechSynthesisUtterance(cue.text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = fitRate(cue.text, seconds) * videoRate;
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      if (this.current === u) this.current = null;
      onEnd();
    };
    u.onend = end;
    u.onerror = (e) => {
      if (e.error === 'not-allowed') this.onIssue?.('blocked');
      end();
    };
    u.onstart = () => this.onIssue?.(null);
    this.current = u;
    synth.speak(u);
    return {
      stop: () => {
        ended = true; // a cancelled line doesn't advance the queue
        if (this.current === u) this.current = null;
        synth.cancel();
      },
    };
  }
}

export interface DubEngineOptions {
  video: HTMLVideoElement;
  lang: string;
  voiceURI: string | null;
  /** Defaults to SystemSpeaker(lang, voiceURI). */
  speaker?: Speaker;
  /** For tests/diagnostics: a line started (rate = speech rate used). */
  onSpeak?(cue: Cue, rate: number): void;
  onIssue?(issue: DubIssue | null): void;
}

export class DubEngine {
  private cues: Cue[] = [];
  private lastIndex = -1;
  private current: Utterance | null = null;
  private queued: Cue | null = null;
  private waitingFor: Cue | null = null;
  private pausedByUs = false;
  private savedVolume: number | null = null;
  private duckedTo: number | null = null;
  private suspended = false;
  private rvfc = 0;
  private stopped = false;
  private readonly speaker: Speaker;

  constructor(private readonly o: DubEngineOptions) {
    this.speaker = o.speaker ?? new SystemSpeaker(o.lang, o.voiceURI, (i) => o.onIssue?.(i));
    const v = o.video;
    v.addEventListener('timeupdate', this.tick);
    v.addEventListener('seeking', this.reset);
    v.addEventListener('ratechange', this.reset);
    v.addEventListener('pause', this.onPause);
    v.addEventListener('play', this.tick);
    if ('requestVideoFrameCallback' in v) this.rvfc = v.requestVideoFrameCallback(this.onFrame);
  }

  setCues(cues: Cue[]): void {
    this.cues = cues;
  }

  /** Ads, overlay hidden, etc. */
  setSuspended(s: boolean): void {
    if (s && !this.suspended) this.reset();
    this.suspended = s;
  }

  stop(): void {
    this.stopped = true;
    this.reset();
    this.speaker.dispose?.();
    const v = this.o.video;
    v.removeEventListener('timeupdate', this.tick);
    v.removeEventListener('seeking', this.reset);
    v.removeEventListener('ratechange', this.reset);
    v.removeEventListener('pause', this.onPause);
    v.removeEventListener('play', this.tick);
    if (this.rvfc) v.cancelVideoFrameCallback(this.rvfc);
  }

  private onFrame = () => {
    this.tick();
    if (!this.stopped) this.rvfc = this.o.video.requestVideoFrameCallback(this.onFrame);
  };

  private onPause = () => {
    // Our own holds keep the current line going; a user pause stops it.
    if (!this.pausedByUs) this.reset();
  };

  private hold() {
    if (this.pausedByUs) return;
    this.pausedByUs = true;
    this.o.video.pause();
  }

  private release() {
    if (!this.pausedByUs) return;
    this.pausedByUs = false;
    void this.o.video.play();
  }

  private tick = () => {
    const v = this.o.video;
    if (this.stopped || this.suspended || v.paused) return;
    const i = findCueIndex(this.cues, v.currentTime);
    if (i === this.lastIndex) return;
    this.lastIndex = i;
    // Prepare what's coming (from the current cue, or the next one in a gap).
    const from = i >= 0 ? i + 1 : this.cues.findIndex((c) => c.start > v.currentTime);
    if (from >= 0) this.speaker.upcoming?.(this.cues.slice(from, from + LOOKAHEAD));
    const cue = this.cues[i];
    if (!cue || v.currentTime - cue.start > MAX_LATE_S) return;
    if (this.current || this.waitingFor) {
      // Previous line is still talking (or still being prepared): hold the video, then say this one.
      this.queued = cue;
      this.hold();
      return;
    }
    this.speak(cue);
  };

  /** Stop talking and resync to wherever the playhead is. */
  private reset = () => {
    this.queued = null;
    this.waitingFor = null;
    this.lastIndex = -1;
    const cur = this.current;
    this.current = null;
    cur?.stop();
    this.unduck();
    this.release();
  };

  /** The current line finished (or failed): say the queued one or let the video go. */
  private next() {
    const q = this.queued;
    this.queued = null;
    if (q) {
      this.speak(q);
    } else {
      this.unduck();
      this.release();
    }
  }

  private speak(cue: Cue) {
    if (!cue.text) return this.next();
    const v = this.o.video;
    const videoRate = v.playbackRate || 1;
    const seconds = (cue.end - cue.start) / videoRate;
    let mine: Utterance | null = null;
    const r = this.speaker.say(cue, seconds, videoRate, () => {
      if (this.current !== mine) return; // cancelled
      this.current = null;
      this.next();
    });
    if (r === 'no-voice') {
      this.o.onIssue?.('no-voice');
      return;
    }
    if (r === 'not-ready') {
      // Audio still generating: hold the video until it's ready (or give up on this line).
      this.waitingFor = cue;
      this.hold();
      this.o.onIssue?.('preparing');
      const ready = this.speaker.whenReady?.(cue) ?? Promise.reject(new Error('no whenReady'));
      const timeout = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error('timeout')), READY_TIMEOUT_MS),
      );
      Promise.race([ready, timeout]).then(
        () => {
          if (this.waitingFor !== cue) return; // reset meanwhile
          this.waitingFor = null;
          this.o.onIssue?.(null);
          this.speak(cue);
        },
        () => {
          if (this.waitingFor !== cue) return;
          this.waitingFor = null;
          this.o.onIssue?.(null);
          this.next();
        },
      );
      return;
    }
    mine = r;
    this.current = r;
    this.duck();
    this.release();
    this.o.onSpeak?.(cue, fitRate(cue.text, seconds));
  }

  private duck() {
    const v = this.o.video;
    if (v.muted) return;
    if (this.savedVolume === null) this.savedVolume = v.volume;
    this.duckedTo = this.savedVolume * DUCK_LEVEL;
    v.volume = this.duckedTo;
  }

  private unduck() {
    const v = this.o.video;
    // If the user changed the volume meanwhile, leave theirs.
    if (
      this.savedVolume !== null &&
      this.duckedTo !== null &&
      Math.abs(v.volume - this.duckedTo) < 1e-3
    ) {
      v.volume = this.savedVolume;
    }
    this.savedVolume = null;
    this.duckedTo = null;
  }
}
