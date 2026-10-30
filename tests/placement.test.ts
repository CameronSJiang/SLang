import { describe, expect, it } from 'vitest';
import {
  BANDS,
  buildPlacement,
  PSEUDO_COUNT,
  scorePlacement,
  seededRandom,
  WORDS_PER_BAND,
} from '../src/core/placement';

const freq = Array.from({ length: 20000 }, (_, i) => `palabra${i + 1}`);

describe('placement test', () => {
  const items = buildPlacement(freq, 'es', seededRandom(42));

  it('samples every band plus ~20% pseudo-words', () => {
    expect(items).toHaveLength(BANDS.length * WORDS_PER_BAND + PSEUDO_COUNT);
    expect(items.filter((i) => i.band < 0)).toHaveLength(PSEUDO_COUNT);
    for (const it of items.filter((i) => i.band >= 0)) {
      const rank = freq.indexOf(it.word) + 1;
      const [lo, hi] = BANDS[it.band]!;
      expect(rank).toBeGreaterThanOrEqual(lo);
      expect(rank).toBeLessThanOrEqual(hi);
    }
  });

  it('drops pseudo-words that are real words', () => {
    const withReal = buildPlacement([...freq.slice(0, 100), 'plundero'], 'es', seededRandom(1));
    expect(withReal.some((i) => i.word === 'plundero' && i.band < 0)).toBe(false);
  });

  it('estimates vocabulary from honest answers', () => {
    // Knows everything up to rank 3000, nothing rarer, rejects pseudo-words.
    const yes = items.map((it) => it.band >= 0 && it.band <= 2);
    expect(scorePlacement(items, yes)).toMatchObject({
      vocab: 3000,
      level: 'B2',
      falseAlarmRate: 0,
    });
  });

  it('penalizes saying yes to everything', () => {
    const r = scorePlacement(
      items,
      items.map(() => true),
    );
    expect(r.vocab).toBe(100);
    expect(r.level).toBe('A1');
  });

  it('a beginner lands at A1/A2', () => {
    const yes = items.map((it) => it.band === 0);
    expect(['A1', 'A2']).toContain(scorePlacement(items, yes).level);
  });
});
