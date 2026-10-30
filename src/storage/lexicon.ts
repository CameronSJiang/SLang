/** Learner lexicon and saved cards in IndexedDB. Background-only (content scripts message it). */
import { createEmptyCard } from 'ts-fsrs';
import type { WordInfo } from '../core/glossPolicy';
import {
  applyEvent,
  lemmaKey,
  newEntry,
  priorPKnown,
  UNLISTED_RANK,
  vocabFor,
  type LexEvent,
} from '../core/learner';
import type { Settings } from '../core/settings';
import type { Card, LexEntry } from '../core/types';
import { db } from './db';
import { loadFreq } from './freq';

export interface SaveCardInput {
  sentence: string;
  gloss: string;
  videoId: string;
  t: number;
}

async function rankFn(lang: string) {
  const freq = await loadFreq(lang);
  return (lemma: string, surface?: string) =>
    freq?.rank(lemma) ??
    (surface ? freq?.rank(surface.toLocaleLowerCase()) : undefined) ??
    UNLISTED_RANK;
}

function info(entry: LexEntry | undefined, rank: number, vocab: number): WordInfo {
  return {
    pKnown: entry?.pKnown ?? priorPKnown(rank, vocab),
    state: entry?.state ?? 'new',
    custom: entry?.custom ?? false,
    rank,
  };
}

/** WordInfo for each lemma (prior for words never touched). */
export async function getWordInfo(
  lang: string,
  lemmas: string[],
  s: Settings,
): Promise<Record<string, WordInfo>> {
  const keys = [...new Set(lemmas.map(lemmaKey))];
  const [rank, entries] = await Promise.all([
    rankFn(lang),
    db.lexicon.bulkGet(keys.map((k) => [lang, k] as [string, string])),
  ]);
  const vocab = vocabFor(s.level, s.vocabSize);
  const out: Record<string, WordInfo> = {};
  keys.forEach((k, i) => (out[k] = info(entries[i], rank(k), vocab)));
  return out;
}

/** Apply learner signals; returns updated WordInfo per lemma. */
export async function applyLexEvents(
  lang: string,
  events: { lemma: string; event: LexEvent }[],
  s: Settings,
): Promise<Record<string, WordInfo>> {
  const rank = await rankFn(lang);
  const vocab = vocabFor(s.level, s.vocabSize);
  const now = Date.now();
  const out: Record<string, WordInfo> = {};
  await db.transaction('rw', db.lexicon, async () => {
    for (const { lemma, event } of events) {
      const k = lemmaKey(lemma);
      const prior = priorPKnown(rank(k), vocab);
      const current = (await db.lexicon.get([lang, k])) ?? newEntry(k, lang, prior, now);
      const next = applyEvent(current, event, now, prior);
      await db.lexicon.put(next);
      out[k] = info(next, rank(k), vocab);
    }
  });
  return out;
}

/** Save a word for review with the sentence and clip it came from (rule 4). */
export async function saveCard(lang: string, lemma: string, input: SaveCardInput): Promise<Card> {
  const k = lemmaKey(lemma);
  // One card per lemma per video: re-saving refreshes the context instead of duplicating.
  const id = `${lang}:${k}:${input.videoId}`;
  const existing = await db.cards.get(id);
  const card: Card = {
    id,
    lemma: k,
    lang,
    sentence: input.sentence,
    gloss: input.gloss,
    videoId: input.videoId,
    t: input.t,
    fsrs: existing?.fsrs ?? createEmptyCard(new Date()),
  };
  await db.cards.put(card);
  return card;
}
