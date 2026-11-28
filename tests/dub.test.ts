import { describe, expect, it } from 'vitest';
import {
  MAX_SLOT_EXTEND_S,
  fitRate,
  pickVoice,
  prefetchWindow,
  slotEnd,
  voicesFor,
} from '../src/core/dub';

describe('fitRate', () => {
  it('speaks at normal speed when the line fits', () => {
    expect(fitRate('Hola a todos.', 3)).toBe(1);
  });
  it('speeds up to fit, capped at 1.6×', () => {
    expect(fitRate('x'.repeat(45), 2.5)).toBeCloseTo(1.2);
    expect(fitRate('x'.repeat(200), 2)).toBe(1.6);
    expect(fitRate('hola', 0)).toBe(1.6);
  });
});

describe('voices', () => {
  const v = (name: string, lang: string, localService: boolean) => ({
    voiceURI: name,
    name,
    lang,
    localService,
  });
  const voices = [
    v('Google español', 'es-ES', false),
    v('Paulina', 'es-MX', true),
    v('Samantha', 'en-US', true),
    v('Jorge', 'es_ES', true),
  ];

  it('lists target-language voices, on-device first', () => {
    expect(voicesFor(voices, 'es').map((x) => x.name)).toEqual([
      'Jorge',
      'Paulina',
      'Google español',
    ]);
  });
  it('keeps the chosen voice, else prefers on-device', () => {
    expect(pickVoice(voices, 'es', 'Google español')?.name).toBe('Google español');
    expect(pickVoice(voices, 'es', 'gone')?.name).toBe('Jorge');
    expect(pickVoice([v('Google español', 'es-ES', false)], 'es', null)).toBeUndefined();
  });
});

describe('slotEnd', () => {
  const cs = [
    { start: 0, end: 1 },
    { start: 1.5, end: 2 },
    { start: 10, end: 12 },
    { start: 11, end: 13 }, // overlaps the previous one (rolling auto-captions)
  ];
  it('runs until the next caption appears', () => expect(slotEnd(cs, 0)).toBe(1.5));
  it('borrows at most MAX_SLOT_EXTEND_S after its own end', () =>
    expect(slotEnd(cs, 1)).toBe(2 + MAX_SLOT_EXTEND_S));
  it('stops at the next start when captions overlap', () => expect(slotEnd(cs, 2)).toBe(11));
  it('the last line gets the extension too', () =>
    expect(slotEnd(cs, 3)).toBe(13 + MAX_SLOT_EXTEND_S));
});

describe('prefetchWindow', () => {
  const cs = [
    { id: 'a', start: 0, end: 2 },
    { id: 'b', start: 5, end: 6 },
    { id: 'c', start: 100, end: 101 },
  ];
  it('includes the current line and what starts within the window', () =>
    expect(prefetchWindow(cs, 1, 90).map((c) => c.id)).toEqual(['a', 'b']));
  it('skips lines already over', () =>
    expect(prefetchWindow(cs, 3, 90).map((c) => c.id)).toEqual(['b']));
});
