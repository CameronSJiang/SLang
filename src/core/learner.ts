/**
 * Learner model: how likely the learner knows a lemma (pKnown), from a
 * frequency-rank prior plus implicit and explicit signals. Pure.
 */
import type { Level } from './settings';
import type { LexEntry, WordState } from './types';

/** Rough receptive vocabulary per CEFR level (word families ≈ frequency ranks). */
export const LEVEL_VOCAB: Record<Level, number> = {
  A1: 500,
  A2: 1000,
  B1: 2000,
  B2: 4000,
  C1: 8000,
};

/** Rank assumed for words missing from the frequency list (rare). */
export const UNLISTED_RANK = 40000;
/** Steepness of the logistic prior over log-rank. */
const K = 2.5;
/** Multiplier on pKnown after a lookup: strong evidence the word isn't known. */
const LOOKUP_FACTOR = 0.35;
/** Fraction of the gap to 1 closed by one unclicked exposure. */
const EXPOSURE_GAIN = 0.08;
/** Exposures counted per lemma per session; more add nothing. */
export const EXPOSURE_CAP_PER_SESSION = 3;

/** P(known) for a word of frequency `rank` (1 = most common) given vocabulary size `vocab`. */
export function priorPKnown(rank: number, vocab: number): number {
  const r = Math.max(1, rank);
  return 1 / (1 + Math.exp(K * (Math.log(r) - Math.log(Math.max(1, vocab)))));
}

export function vocabFor(level: Level, vocabSize: number | null): number {
  return vocabSize ?? LEVEL_VOCAB[level];
}

export function lemmaKey(lemma: string): string {
  return lemma.normalize('NFC').toLocaleLowerCase().trim();
}

export function newEntry(lemma: string, lang: string, pKnown: number, now: number): LexEntry {
  return {
    lemma: lemmaKey(lemma),
    lang,
    state: 'new',
    pKnown,
    exposures: 0,
    lookups: 0,
    firstSeen: now,
    lastSeen: now,
    custom: false,
  };
}

export type LexEvent = 'lookup' | 'exposure' | 'known' | 'ignore' | 'save' | 'reset';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Apply one learner signal. Returns a new entry; `prior` seeds entries reset to default. */
export function applyEvent(e: LexEntry, ev: LexEvent, now: number, prior?: number): LexEntry {
  const next: LexEntry = { ...e, lastSeen: now };
  const learning = (s: WordState): WordState => (s === 'known' || s === 'ignored' ? s : 'learning');
  switch (ev) {
    case 'lookup':
      next.lookups += 1;
      next.pKnown = clamp01(e.pKnown * LOOKUP_FACTOR);
      next.state = e.state === 'known' ? 'learning' : learning(e.state);
      break;
    case 'exposure':
      if (e.state === 'ignored') break;
      next.exposures += 1;
      next.pKnown = clamp01(e.pKnown + EXPOSURE_GAIN * (1 - e.pKnown));
      if (e.state === 'new') next.state = 'seen';
      break;
    case 'known':
      next.pKnown = 1;
      next.state = 'known';
      break;
    case 'ignore':
      next.state = 'ignored';
      break;
    case 'save':
      next.custom = true;
      next.state = 'learning';
      next.pKnown = Math.min(e.pKnown, 0.3);
      break;
    case 'reset':
      next.state = 'new';
      next.custom = false;
      next.pKnown = prior ?? e.pKnown;
      break;
  }
  return next;
}

/** Tracks exposures per lemma for one viewing session, enforcing the cap. */
export class ExposureCounter {
  private counts = new Map<string, number>();

  /** True if this exposure should be counted. */
  take(lemma: string): boolean {
    const k = lemmaKey(lemma);
    const n = this.counts.get(k) ?? 0;
    if (n >= EXPOSURE_CAP_PER_SESSION) return false;
    this.counts.set(k, n + 1);
    return true;
  }
}
