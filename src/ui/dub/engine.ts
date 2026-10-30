/**
 * Speaks dubbed cues in sync with a video using speechSynthesis. Lowers the
 * original audio while speaking, speeds lines up to fit, and briefly pauses
 * the video when a line still overruns into the next one.
 */
import { findCueIndex } from '../../core/cueIndex';
import { fitRate, pickVoice } from '../../core/dub';
import type { Cue } from '../../core/types';

/** Original audio level while the dub voice speaks, relative to the user's volume. */
export const DUCK_LEVEL = 0.15;
/** Don't start a line we reach more than this late (e.g. after seeking into it). */
const MAX_LATE_S = 1.0;

export type DubIssue = 'no-voice' | 'blocked';

export interface DubEngineOptions {
  video: HTMLVideoElement;
  lang: string;
  voiceURI: string | null;
  /** For tests/diagnostics: a line started (rate = speech rate used). */
  onSpeak?(cue: Cue, rate: number): void;
  onIssue?(issue: DubIssue | null): void;
}

export class DubEngine {
  private cues: Cue[] = [];
  private lastIndex = -1;
  private utterance: SpeechSynthesisUtterance | null = null;
  private queued: Cue | null = null;
  private pausedByUs = false;
  private savedVolume: number | null = null;
  private duckedTo: number | null = null;
  private suspended = false;
  private rvfc = 0;
  private stopped = false;
  private readonly synth = globalThis.speechSynthesis;

  constructor(private readonly o: DubEngineOptions) {
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
    // Our own overrun pause keeps the current line going; a user pause stops it.
    if (!this.pausedByUs) this.reset();
  };

  private tick = () => {
    const v = this.o.video;
    if (this.stopped || this.suspended || v.paused) return;
    const i = findCueIndex(this.cues, v.currentTime);
    if (i === this.lastIndex) return;
    this.lastIndex = i;
    const cue = this.cues[i];
    if (!cue || v.currentTime - cue.start > MAX_LATE_S) return;
    if (this.utterance) {
      // Previous line is still talking: hold the video until it finishes, then say this one.
      this.queued = cue;
      this.pausedByUs = true;
      v.pause();
      return;
    }
    this.speak(cue);
  };

  /** Stop talking and resync to wherever the playhead is. */
  private reset = () => {
    this.queued = null;
    this.lastIndex = -1;
    if (this.utterance) {
      this.utterance = null;
      this.synth?.cancel();
    }
    this.unduck();
    if (this.pausedByUs) {
      // We were holding the video for an overrunning line; let it play again.
      this.pausedByUs = false;
      void this.o.video.play();
    }
  };

  private speak(cue: Cue) {
    const synth = this.synth;
    if (!synth || !cue.text) return;
    const voice = pickVoice(synth.getVoices(), this.o.lang, this.o.voiceURI);
    if (!voice) {
      this.o.onIssue?.('no-voice');
      return;
    }
    const v = this.o.video;
    const rate = fitRate(cue.text, (cue.end - cue.start) / (v.playbackRate || 1));
    const u = new SpeechSynthesisUtterance(cue.text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = rate * (v.playbackRate || 1);
    const done = () => {
      if (this.utterance !== u) return;
      this.utterance = null;
      const next = this.queued;
      this.queued = null;
      if (next) {
        this.speak(next);
      } else {
        this.unduck();
      }
      if (this.pausedByUs) {
        this.pausedByUs = false;
        void v.play();
      }
    };
    u.onend = done;
    u.onerror = (e) => {
      if (e.error === 'not-allowed') this.o.onIssue?.('blocked');
      done();
    };
    u.onstart = () => this.o.onIssue?.(null);
    this.utterance = u;
    this.duck();
    synth.speak(u);
    this.o.onSpeak?.(cue, rate);
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
