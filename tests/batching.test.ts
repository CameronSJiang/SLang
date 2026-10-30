import { describe, expect, it } from 'vitest';
import { nextChunk, planChunks } from '../src/core/batching';

const cues = Array.from({ length: 10 }, (_, i) => ({
  id: `c${i}`,
  start: i * 2,
  end: i * 2 + 2,
  text: 'x',
}));

describe('planChunks', () => {
  it('splits into fixed-size chunks with context overlap', () => {
    expect(planChunks(10, 4, 2)).toEqual([
      { start: 0, end: 4, contextStart: 0 },
      { start: 4, end: 8, contextStart: 2 },
      { start: 8, end: 10, contextStart: 6 },
    ]);
    expect(planChunks(0, 4, 2)).toEqual([]);
  });
});

describe('nextChunk', () => {
  const chunks = planChunks(10, 4, 2); // covers t = [0,8) [8,16) [16,20)
  it('starts at the playhead, goes forward, then back', () => {
    const pending = new Set([0, 1, 2]);
    const order: number[] = [];
    let i: number | undefined;
    while ((i = nextChunk(pending, chunks, cues, 9)) !== undefined) {
      order.push(i);
      pending.delete(i);
    }
    expect(order).toEqual([1, 2, 0]);
  });

  it('handles a playhead past the end', () => {
    expect(nextChunk(new Set([0, 2]), chunks, cues, 999)).toBe(2);
  });
});
