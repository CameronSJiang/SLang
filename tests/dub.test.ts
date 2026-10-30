import { describe, expect, it } from 'vitest';
import { fitRate, pickVoice, voicesFor } from '../src/core/dub';

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
