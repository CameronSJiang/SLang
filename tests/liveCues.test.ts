import { describe, expect, it } from 'vitest';
import { cleanVttText, LiveCueBuilder } from '../src/core/liveCues';

describe('LiveCueBuilder', () => {
  it('opens and closes cues as text changes', () => {
    const b = new LiveCueBuilder();
    expect(b.push('Hola', 1)).toBe(true);
    expect(b.push(' Hola ', 1.5)).toBe(false);
    b.push('¿Qué tal?', 2);
    b.push('', 3);
    expect(b.cues.map((c) => [c.text, c.start, c.end])).toEqual([
      ['Hola', 1, 2],
      ['¿Qué tal?', 2, 3],
    ]);
  });

  it('drops cues after a backwards seek', () => {
    const b = new LiveCueBuilder();
    b.push('a', 1);
    b.push('b', 5);
    b.push('c', 2);
    expect(b.cues.map((c) => c.text)).toEqual(['a', 'c']);
    expect(b.cues[1]?.end).toBe(Infinity);
  });
});

describe('cleanVttText', () => {
  it('strips tags and decodes entities', () => {
    expect(cleanVttText('<v Ana><c.yellow>Hola</c> &amp; adiós</v>\n<00:01.000>ya')).toBe(
      'Hola & adiós ya',
    );
  });
});
