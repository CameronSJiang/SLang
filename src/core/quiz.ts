/**
 * Draco's quizzes: multiple-choice "what does this word mean?" questions.
 * Picks words the learner probably knows but hasn't confirmed, plus saved
 * words that are due, and builds distractors from other words' meanings.
 */
import type { WordState } from './types';

export interface QuizWord {
  lemma: string;
  gloss: string;
  pos: string;
  /** A sentence the word was met in, and where (for context and the clip link). */
  sentence?: string;
  surface?: string;
  videoId?: string;
  t?: number;
  pKnown: number;
  state: WordState;
  /** Saved card id, when the word is saved for review. */
  cardId?: string;
  /** Saved card is due for review. */
  due?: boolean;
}

export interface QuizQuestion {
  word: QuizWord;
  choices: string[];
  /** Index of the right choice. */
  answer: number;
}

/** "Probably known" band: likely, but not confirmed. */
export const QUIZ_P_MIN = 0.45;
export const QUIZ_P_MAX = 0.92;
const CHOICES = 4;

/** Same meaning, ignoring case, articles and punctuation ("to eat" ≈ "eat"). */
export function normGloss(g: string): string {
  return g
    .toLocaleLowerCase()
    .replace(/[.,;:!?¡¿"'()]/g, '')
    .replace(/^(to|a|an|the)\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function shuffle<T>(xs: T[], rng: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

const quizzable = (w: QuizWord) => !!w.gloss.trim() && w.state !== 'ignored';

/**
 * Up to `n` words: due saved words first (at most half when there are enough
 * others), then "probably known" words, uncertain ones first.
 */
export function pickQuizWords(pool: QuizWord[], n: number, rng: () => number): QuizWord[] {
  const ok = pool.filter(quizzable);
  const due = shuffle(
    ok.filter((w) => w.cardId && w.due),
    rng,
  );
  const probable = shuffle(
    ok.filter(
      (w) => !w.cardId && w.state !== 'known' && w.pKnown >= QUIZ_P_MIN && w.pKnown <= QUIZ_P_MAX,
    ),
    rng,
  ).sort((a, b) => a.pKnown - b.pKnown);
  const fromDue = Math.min(due.length, Math.max(Math.ceil(n / 2), n - probable.length));
  const picked = [...due.slice(0, fromDue), ...probable.slice(0, n - fromDue)];
  return shuffle(picked, rng);
}

/** Wrong choices: other meanings from the pool, same part of speech first. */
export function buildQuestion(
  word: QuizWord,
  pool: QuizWord[],
  rng: () => number,
): QuizQuestion | null {
  const right = normGloss(word.gloss);
  const seen = new Set([right]);
  const others = shuffle(
    pool.filter((w) => w.lemma !== word.lemma && w.gloss.trim()),
    rng,
  ).sort((a, b) => Number(b.pos === word.pos) - Number(a.pos === word.pos));
  const wrong: string[] = [];
  for (const w of others) {
    const g = normGloss(w.gloss);
    if (seen.has(g)) continue;
    seen.add(g);
    wrong.push(w.gloss.trim());
    if (wrong.length === CHOICES - 1) break;
  }
  if (wrong.length < CHOICES - 1) return null;
  const choices = shuffle([word.gloss.trim(), ...wrong], rng);
  return { word, choices, answer: choices.indexOf(word.gloss.trim()) };
}

export function buildQuiz(pool: QuizWord[], n: number, rng: () => number): QuizQuestion[] {
  return pickQuizWords(pool, n, rng)
    .map((w) => buildQuestion(w, pool, rng))
    .filter((q): q is QuizQuestion => q !== null);
}

/** Deterministic PRNG for tests (mulberry32). */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
