import { describe, expect, it } from 'vitest';
import { findCueIndex } from '../src/core/cueIndex';

const cues = [
  { id: 'a', start: 1, end: 2, text: 'a' },
  { id: 'b', start: 2, end: 4, text: 'b' },
  { id: 'c', start: 6, end: 7, text: 'c' },
];

describe('findCueIndex', () => {
  it('finds the active cue', () => {
    expect(findCueIndex(cues, 1)).toBe(0);
    expect(findCueIndex(cues, 1.99)).toBe(0);
    expect(findCueIndex(cues, 2)).toBe(1);
    expect(findCueIndex(cues, 6.5)).toBe(2);
  });

  it('returns -1 in gaps and out of range', () => {
    expect(findCueIndex(cues, 0)).toBe(-1);
    expect(findCueIndex(cues, 5)).toBe(-1);
    expect(findCueIndex(cues, 7)).toBe(-1);
    expect(findCueIndex([], 1)).toBe(-1);
  });

  it('handles open-ended live cues', () => {
    expect(findCueIndex([{ id: 'x', start: 3, end: Infinity, text: 'x' }], 1e6)).toBe(0);
  });
});
