import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DUCK_LEVEL, DubEngine, type DubIssue } from '../src/ui/dub/engine';
import type { Cue } from '../src/core/types';

class FakeVideo extends EventTarget {
  currentTime = 0;
  paused = false;
  muted = false;
  volume = 1;
  playbackRate = 1;
  async play() {
    this.paused = false;
    this.dispatchEvent(new Event('play'));
  }
  pause() {
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  }
  at(t: number) {
    this.currentTime = t;
    this.dispatchEvent(new Event('timeupdate'));
  }
  seek(t: number) {
    this.dispatchEvent(new Event('seeking'));
    this.at(t);
  }
}

class FakeUtterance {
  voice: unknown = null;
  lang = '';
  rate = 1;
  onend: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onstart: (() => void) | null = null;
  constructor(readonly text: string) {}
}

class FakeSynth {
  spoken: FakeUtterance[] = [];
  voices = [{ voiceURI: 'Jorge', name: 'Jorge', lang: 'es-ES', localService: true }];
  current: FakeUtterance | null = null;
  getVoices() {
    return this.voices;
  }
  speak(u: FakeUtterance) {
    this.spoken.push(u);
    this.current = u;
    u.onstart?.();
  }
  cancel() {
    this.current = null;
  }
  finish() {
    const u = this.current;
    this.current = null;
    u?.onend?.();
  }
}

const cues: Cue[] = [
  { id: 'a', start: 1, end: 3, text: 'Hola a todos.' },
  { id: 'b', start: 3, end: 4, text: 'Esta frase es demasiado larga para un segundo.' },
  { id: 'c', start: 6, end: 8, text: 'Adiós.' },
];

const g = globalThis as Record<string, unknown>;
let synth: FakeSynth;
let video: FakeVideo;
let issues: (DubIssue | null)[];
let engine: DubEngine;

beforeEach(() => {
  synth = new FakeSynth();
  g.speechSynthesis = synth;
  g.SpeechSynthesisUtterance = FakeUtterance;
  video = new FakeVideo();
  issues = [];
  engine = new DubEngine({
    video: video as unknown as HTMLVideoElement,
    lang: 'es',
    voiceURI: null,
    onIssue: (i) => issues.push(i),
  });
  engine.setCues(cues);
});
afterEach(() => engine.stop());

describe('DubEngine', () => {
  it('speaks each line when it starts and ducks the original audio meanwhile', () => {
    video.at(1.05);
    expect(synth.spoken.map((u) => u.text)).toEqual(['Hola a todos.']);
    expect(video.volume).toBeCloseTo(DUCK_LEVEL);
    synth.finish();
    expect(video.volume).toBe(1);
    video.at(1.5); // same cue: nothing new
    expect(synth.spoken).toHaveLength(1);
  });

  it('speeds long lines up (max 1.6×)', () => {
    video.at(3.01);
    expect(synth.spoken[0]?.rate).toBe(1.6);
  });

  it('holds the video while a line overruns, then says the next one', () => {
    video.at(1.05);
    video.at(3.01); // line a still talking
    expect(video.paused).toBe(true);
    expect(synth.spoken).toHaveLength(1);
    synth.finish();
    expect(synth.spoken.map((u) => u.text)).toHaveLength(2);
    expect(video.paused).toBe(false);
  });

  it('a seek stops speech, restores volume, and skips lines joined too late', () => {
    video.at(1.05);
    video.dispatchEvent(new Event('seeking'));
    expect(synth.current).toBeNull();
    expect(video.volume).toBe(1);
    video.at(6.0);
    expect(synth.spoken.at(-1)?.text).toBe('Adiós.');
    synth.finish();
    video.seek(7.5); // 1.5s into "Adiós." — too late to start it
    expect(synth.spoken).toHaveLength(2);
  });

  it('leaves the volume alone if the user changed it while ducked', () => {
    video.at(1.05);
    video.volume = 0.5;
    synth.finish();
    expect(video.volume).toBe(0.5);
  });

  it('a user pause stops the current line', () => {
    video.at(1.05);
    video.pause();
    expect(synth.current).toBeNull();
    expect(video.volume).toBe(1);
  });

  it('reports when there is no on-device voice', () => {
    synth.voices = [];
    video.at(1.05);
    expect(issues).toContain('no-voice');
    expect(synth.spoken).toHaveLength(0);
  });

  it('does nothing while suspended (ads)', () => {
    engine.setSuspended(true);
    video.at(1.05);
    expect(synth.spoken).toHaveLength(0);
  });
});
