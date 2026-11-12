/**
 * Speaker backed by on-device Kokoro. Lines are generated ahead of the
 * playhead (one at a time, in order) and played as audio clips, sped up with
 * pitch preserved when a line is longer than its slot.
 */
import { MAX_RATE } from '../../core/dub';
import type { Cue } from '../../core/types';
import { fromBase64 } from '../../tts/messages';
import { ttsSpeak } from '../../tts/client';
import type { DubIssue, Speaker, Utterance } from './engine';

interface Ready {
  url: string;
  seconds: number;
}

/** Clips kept in memory (older ones are released). */
const KEEP = 40;

export class KokoroSpeaker implements Speaker {
  private clips = new Map<string, Promise<Ready>>();
  private done = new Map<string, Ready>();
  private wanted: Cue[] = [];
  private working = false;
  private disposed = false;

  constructor(
    private readonly voice: string,
    private readonly speed: number,
    private readonly onIssue?: (i: DubIssue | null) => void,
  ) {}

  private key = (cue: Cue) => `${cue.start}|${cue.text}`;

  private generate(cue: Cue): Promise<Ready> {
    const k = this.key(cue);
    let p = this.clips.get(k);
    if (!p) {
      p = ttsSpeak(cue.text, this.voice, this.speed).then((clip) => {
        const blob = new Blob([fromBase64(clip.wav)], { type: 'audio/wav' });
        const r = { url: URL.createObjectURL(blob), seconds: clip.seconds };
        this.done.set(k, r);
        this.trim();
        return r;
      });
      p.catch(() => this.clips.delete(k));
      this.clips.set(k, p);
    }
    return p;
  }

  private trim() {
    while (this.done.size > KEEP) {
      const [k, r] = this.done.entries().next().value as [string, Ready];
      URL.revokeObjectURL(r.url);
      this.done.delete(k);
      this.clips.delete(k);
    }
  }

  /** Generate wanted cues one at a time (the model runs one prompt at a time anyway). */
  private async pump() {
    if (this.working) return;
    this.working = true;
    try {
      for (;;) {
        if (this.disposed) return;
        const next = this.wanted.find((c) => !this.clips.has(this.key(c)));
        if (!next) return;
        await this.generate(next).catch(() => {});
      }
    } finally {
      this.working = false;
    }
  }

  upcoming(cues: Cue[]): void {
    this.wanted = cues.filter((c) => c.text);
    void this.pump();
  }

  whenReady(cue: Cue): Promise<void> {
    return this.generate(cue).then(() => undefined);
  }

  say(cue: Cue, seconds: number, videoRate: number, onEnd: () => void): Utterance | 'not-ready' {
    const r = this.done.get(this.key(cue));
    if (!r) {
      // Jump the queue: this one is needed now.
      this.wanted = [cue, ...this.wanted.filter((c) => c !== cue)];
      void this.generate(cue);
      return 'not-ready';
    }
    const audio = new Audio(r.url);
    audio.preservesPitch = true;
    audio.playbackRate =
      Math.min(MAX_RATE, Math.max(1, seconds > 0 ? r.seconds / seconds : MAX_RATE)) * videoRate;
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      onEnd();
    };
    audio.onended = end;
    audio.onerror = end;
    audio.play().then(
      () => this.onIssue?.(null),
      (e: unknown) => {
        if (e instanceof DOMException && e.name === 'NotAllowedError') this.onIssue?.('blocked');
        end();
      },
    );
    return {
      stop: () => {
        ended = true;
        audio.pause();
      },
    };
  }

  dispose(): void {
    this.disposed = true;
    for (const r of this.done.values()) URL.revokeObjectURL(r.url);
    this.done.clear();
    this.clips.clear();
  }
}
