/**
 * Placement test (LexTALE-style yes/no vocabulary check): real words sampled
 * across frequency bands plus ~20% pseudo-words that penalize guessing. Pure.
 */
import type { Level } from './settings';

export const BANDS: readonly [number, number][] = [
  [1, 500],
  [501, 1500],
  [1501, 3000],
  [3001, 6000],
  [6001, 12000],
  [12001, 20000],
];
export const WORDS_PER_BAND = 6;
export const PSEUDO_COUNT = 9; // 9 / 45 = 20%

/** Plausible-looking non-words. Any that turn out to be in the frequency list are dropped. */
export const PSEUDO_WORDS: Record<string, readonly string[]> = {
  es: [
    'plundero', 'sarbido', 'flecoso', 'borfiga', 'gelpudo', 'cerpina', 'fusticar', 'mandocho',
    'pertalo', 'quisada', 'tolbeña', 'zarmido', 'vestolar', 'crapiña', 'lombrecer', 'durfano',
    'espilco', 'graveña', 'tremujo', 'chaspera', 'almustre', 'pelandra', 'casporro', 'nolteza',
  ],
}; // prettier-ignore

export interface PlacementItem {
  word: string;
  /** Band index, or -1 for a pseudo-word. */
  band: number;
}

export interface PlacementResult {
  vocab: number;
  level: Level;
  falseAlarmRate: number;
}

export const supportsPlacement = (lang: string): boolean => lang in PSEUDO_WORDS;

/** Mulberry32: small seeded PRNG so a test run is reproducible. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(xs: readonly T[], n: number, rand: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a.slice(0, n);
}

/** `freq` is the frequency list, most common first. */
export function buildPlacement(
  freq: readonly string[],
  lang: string,
  rand: () => number,
): PlacementItem[] {
  const real = new Set(freq);
  const items: PlacementItem[] = [];
  BANDS.forEach(([lo, hi], band) => {
    // Skip very short entries (abbreviations, fragments) that make poor test items.
    const pool = freq.slice(lo - 1, hi).filter((w) => [...w].length >= 3);
    for (const word of pick(pool, WORDS_PER_BAND, rand)) items.push({ word, band });
  });
  const pseudo = (PSEUDO_WORDS[lang] ?? []).filter((w) => !real.has(w));
  for (const word of pick(pseudo, PSEUDO_COUNT, rand)) items.push({ word, band: -1 });
  return pick(items, items.length, rand);
}

export function levelForVocab(vocab: number): Level {
  if (vocab < 750) return 'A1';
  if (vocab < 1500) return 'A2';
  if (vocab < 3000) return 'B1';
  if (vocab < 6000) return 'B2';
  return 'C1';
}

/** Estimate vocabulary size from yes/no answers, corrected for guessing. */
export function scorePlacement(
  items: readonly PlacementItem[],
  yes: readonly boolean[],
): PlacementResult {
  const pseudo = items.filter((it) => it.band < 0);
  const falseAlarms = pseudo.filter((it) => yes[items.indexOf(it)]).length;
  const f = pseudo.length ? falseAlarms / pseudo.length : 0;
  let vocab = 0;
  BANDS.forEach(([lo, hi], band) => {
    const idx = items.flatMap((it, i) => (it.band === band ? [i] : []));
    if (!idx.length) return;
    const hit = idx.filter((i) => yes[i]).length / idx.length;
    const known = f >= 1 ? 0 : Math.max(0, (hit - f) / (1 - f));
    vocab += known * (hi - lo + 1);
  });
  const rounded = Math.max(100, Math.round(vocab / 50) * 50);
  return { vocab: rounded, level: levelForVocab(rounded), falseAlarmRate: f };
}
