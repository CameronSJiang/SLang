import { describe, expect, it } from 'vitest';
import { parseJson3 } from '../src/core/json3';
import asr from './fixtures/json3-asr.json';
import manual from './fixtures/json3-manual.json';

describe('parseJson3', () => {
  it('keeps manual events as cues and flattens newlines', () => {
    expect(parseJson3(manual)).toEqual([
      { id: 'c0', start: 1, end: 3, text: '¿Qué tal? Muy bien.' },
      { id: 'c1', start: 3.5, end: 5, text: 'Me alegro.' },
    ]);
  });

  it('merges ASR fragments, splitting on punctuation, gaps and word cap', () => {
    const cues = parseJson3(asr);
    expect(cues.map((c) => c.text)).toEqual([
      'hola a todos bienvenidos al canal.',
      'hoy vamos',
      'uno dos tres cuatro cinco seis siete ocho nueve diez once doce',
      'trece',
    ]);
    expect(cues.map((c) => [c.start, c.end])).toEqual([
      [0.1, 4],
      [4, 5],
      [6.5, 8.9],
      [8.9, 12.5],
    ]);
  });

  it('detects ASR from word offsets unless told otherwise', () => {
    expect(parseJson3(asr, { asr: false })).toHaveLength(4); // one cue per event with text
    expect(parseJson3(manual, { asr: true }).map((c) => c.text)).toEqual([
      '¿Qué tal? Muy bien.',
      'Me alegro.',
    ]);
  });

  it('returns no cues for garbage', () => {
    expect(parseJson3(null)).toEqual([]);
    expect(parseJson3({ events: 'x' })).toEqual([]);
    expect(parseJson3({ events: [null, 3, { segs: [{ utf8: 5 }] }] })).toEqual([]);
  });
});
