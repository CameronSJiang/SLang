import { describe, expect, it } from 'vitest';
import {
  applyEvent,
  EXPOSURE_CAP_PER_SESSION,
  ExposureCounter,
  LEVEL_VOCAB,
  newEntry,
  priorPKnown,
  vocabFor,
} from '../src/core/learner';

describe('priorPKnown', () => {
  it('is 0.5 at the vocabulary size and falls with rarity', () => {
    expect(priorPKnown(2000, 2000)).toBeCloseTo(0.5);
    expect(priorPKnown(50, 2000)).toBeGreaterThan(0.99);
    expect(priorPKnown(20000, 2000)).toBeLessThan(0.01);
  });

  it('is higher for advanced learners', () => {
    expect(priorPKnown(3000, LEVEL_VOCAB.C1)).toBeGreaterThan(priorPKnown(3000, LEVEL_VOCAB.A1));
    expect(vocabFor('A2', null)).toBe(1000);
    expect(vocabFor('A2', 3200)).toBe(3200);
  });
});

describe('applyEvent', () => {
  const e = newEntry('Perro', 'es', 0.6, 0);

  it('normalizes the lemma', () => expect(e.lemma).toBe('perro'));

  it('lookup pushes pKnown down hard and marks learning', () => {
    const l = applyEvent(e, 'lookup', 1);
    expect(l.pKnown).toBeCloseTo(0.21);
    expect(l).toMatchObject({ state: 'learning', lookups: 1, lastSeen: 1 });
  });

  it('exposure nudges up a little and marks seen', () => {
    const x = applyEvent(e, 'exposure', 1);
    expect(x.pKnown).toBeCloseTo(0.632);
    expect(x).toMatchObject({ state: 'seen', exposures: 1 });
    expect(applyEvent({ ...e, state: 'ignored' }, 'exposure', 1).exposures).toBe(0);
  });

  it('known sets 1.0; ignore excludes; save makes a custom target', () => {
    expect(applyEvent(e, 'known', 1)).toMatchObject({ pKnown: 1, state: 'known' });
    expect(applyEvent(e, 'ignore', 1).state).toBe('ignored');
    expect(applyEvent(e, 'save', 1)).toMatchObject({
      custom: true,
      state: 'learning',
      pKnown: 0.3,
    });
    expect(applyEvent(applyEvent(e, 'known', 1), 'lookup', 2).state).toBe('learning');
  });

  it('reset restores the prior', () => {
    const r = applyEvent(applyEvent(e, 'save', 1), 'reset', 2, 0.6);
    expect(r).toMatchObject({ state: 'new', custom: false, pKnown: 0.6 });
  });
});

describe('ExposureCounter', () => {
  it('caps exposures per lemma per session', () => {
    const c = new ExposureCounter();
    const taken = Array.from({ length: 5 }, () => c.take('Casa')).filter(Boolean).length;
    expect(taken).toBe(EXPOSURE_CAP_PER_SESSION);
    expect(c.take('perro')).toBe(true);
  });
});
