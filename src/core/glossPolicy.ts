/** Which words in a cue get a gloss (i+1: just enough, never everything). Pure. */
import type { GlossDensity } from './settings';
import type { Token, WordState } from './types';

export interface WordInfo {
  pKnown: number;
  state: WordState;
  custom: boolean;
  /** Frequency rank, 1 = most common. */
  rank: number;
}

export interface DensityRule {
  /** Gloss words with pKnown below this. */
  threshold: number;
  /** Max glosses per cue. */
  cap: number;
}

export const DENSITY_RULES: Record<GlossDensity, DensityRule> = {
  low: { threshold: 0.35, cap: 1 },
  med: { threshold: 0.5, cap: 2 },
  high: { threshold: 0.7, cap: 3 },
  // Auto aims for ~95-98% known coverage: gloss the likely-unknown words, at most two per line.
  auto: { threshold: 0.5, cap: 2 },
};

const SKIP_POS = new Set(['PROPN', 'NUM', 'PUNCT', 'SYM']);
const NUMERIC = /\p{N}/u;

/**
 * Indexes (into `tokens`) of the words to gloss, in token order. Candidates:
 * pKnown below the threshold, or saved as custom targets; never known/ignored
 * words, proper nouns, numbers, or words without a gloss. Priority: custom,
 * then more frequent (mid-frequency) before rare.
 */
export function selectGlosses(
  tokens: readonly Token[],
  info: (lemma: string) => WordInfo,
  density: GlossDensity,
): number[] {
  const rule = DENSITY_RULES[density];
  const candidates: { i: number; w: WordInfo }[] = [];
  const seen = new Set<string>();
  tokens.forEach((t, i) => {
    if (!t.gloss || SKIP_POS.has(t.pos) || NUMERIC.test(t.surface)) return;
    const w = info(t.lemma);
    if (w.state === 'known' || w.state === 'ignored') return;
    if (!w.custom && w.pKnown >= rule.threshold) return;
    if (seen.has(t.lemma)) return; // one gloss per lemma per line
    seen.add(t.lemma);
    candidates.push({ i, w });
  });
  candidates.sort((a, b) => Number(b.w.custom) - Number(a.w.custom) || a.w.rank - b.w.rank);
  return candidates
    .slice(0, rule.cap)
    .map((c) => c.i)
    .sort((a, b) => a - b);
}
