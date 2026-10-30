import { describe, expect, it } from 'vitest';
import { tokenize } from '../src/core/tokenize';

describe('tokenize', () => {
  it('returns words with char offsets, skipping punctuation', () => {
    const text = '¿Qué tal, María? Muy bien.';
    const words = tokenize(text, 'es');
    expect(words.map((w) => w.surface)).toEqual(['Qué', 'tal', 'María', 'Muy', 'bien']);
    for (const w of words) expect(text.slice(w.start, w.end)).toBe(w.surface);
  });

  it('keeps clitic verbs and numbers as single words', () => {
    expect(tokenize('Dámelo en 20 minutos', 'es').map((w) => w.surface)).toEqual([
      'Dámelo',
      'en',
      '20',
      'minutos',
    ]);
  });
});
