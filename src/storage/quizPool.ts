/**
 * Builds Draco's quiz pool from what's already on this device: meanings from
 * annotated transcripts (videos watched with SLang) and saved cards, joined
 * with the learner model. Runs in extension pages (same IndexedDB).
 */
import Dexie from 'dexie';
import { fsrs, Rating } from 'ts-fsrs';
import { lemmaKey } from '../core/learner';
import type { QuizWord } from '../core/quiz';
import type { Settings } from '../core/settings';
import type { Card } from '../core/types';
import { db } from './db';
import { applyLexEvents, getWordInfo, saveCard } from './lexicon';

/** Names, numbers and punctuation make bad quiz questions. */
const SKIP_POS = new Set(['PROPN', 'NUM', 'PUNCT', 'SYM', 'X']);
/** Plenty for distractors; keeps the scan quick. */
const MAX_POOL = 1500;

/** `youtube:VIDEO:es>en:1` → VIDEO (dub transcripts: `VIDEO~dub`). */
function videoIdOf(key: string): string | undefined {
  return key.split(':')[1]?.replace(/~dub$/, '');
}

export async function loadQuizPool(s: Settings, now = new Date()): Promise<QuizWord[]> {
  const lang = s.targetLang;
  const byLemma = new Map<string, Omit<QuizWord, 'pKnown' | 'state'>>();

  // Saved words first: their own sentence and clip win.
  const cards: Card[] = await db.cards
    .where('[lang+lemma]')
    .between([lang, Dexie.minKey], [lang, Dexie.maxKey])
    .toArray();
  for (const c of cards) {
    if (!c.gloss.trim()) continue;
    const prev = byLemma.get(c.lemma);
    const due = new Date(c.fsrs.due).getTime() <= now.getTime();
    // One entry per lemma; keep the card that's due (or the first).
    if (prev?.due) continue;
    byLemma.set(c.lemma, {
      lemma: c.lemma,
      gloss: c.gloss,
      pos: prev?.pos ?? '',
      sentence: c.sentence,
      videoId: c.videoId,
      t: c.t,
      cardId: c.id,
      due,
    });
  }

  const marker = `:${lang}>`;
  await db.transcripts.each((row) => {
    if (byLemma.size >= MAX_POOL || !row.key.includes(marker)) return;
    const videoId = videoIdOf(row.key);
    for (const cue of row.cues) {
      if (!cue) continue;
      for (const tok of cue.tokens) {
        if (!tok.gloss.trim() || SKIP_POS.has(tok.pos)) continue;
        const k = lemmaKey(tok.lemma);
        const prev = byLemma.get(k);
        if (prev) {
          if (!prev.pos) prev.pos = tok.pos;
          continue;
        }
        byLemma.set(k, {
          lemma: k,
          gloss: tok.gloss,
          pos: tok.pos,
          sentence: cue.text,
          surface: tok.surface,
          ...(videoId ? { videoId } : {}),
          t: cue.start,
        });
      }
    }
  });

  const info = await getWordInfo(lang, [...byLemma.keys()], s);
  return [...byLemma.values()].map((w) => ({
    ...w,
    pKnown: info[w.lemma]?.pKnown ?? 0.5,
    state: info[w.lemma]?.state ?? 'new',
  }));
}

const scheduler = fsrs();

/**
 * Record an answer. Right: the word moves toward "known". Wrong: it's saved
 * for review (with its sentence and clip) so it comes back. Saved cards are
 * rescheduled with FSRS (Good / Again).
 */
export async function recordQuizAnswer(
  s: Settings,
  word: QuizWord,
  correct: boolean,
  now = new Date(),
): Promise<void> {
  const lang = s.targetLang;
  if (word.cardId) {
    const card = await db.cards.get(word.cardId);
    if (card) {
      const rating = correct ? Rating.Good : Rating.Again;
      const next = scheduler.next(card.fsrs, now, rating).card;
      await db.cards.put({ ...card, fsrs: next });
      await db.reviewLog.add({ cardId: card.id, rating, reviewedAt: now.getTime() });
    }
  } else if (!correct && word.videoId && word.sentence) {
    await saveCard(lang, word.lemma, {
      sentence: word.sentence,
      gloss: word.gloss,
      videoId: word.videoId,
      t: word.t ?? 0,
    });
    await applyLexEvents(lang, [{ lemma: word.lemma, event: 'save' }], s);
  }
  await applyLexEvents(
    lang,
    [{ lemma: word.lemma, event: correct ? 'quiz-right' : 'quiz-wrong' }],
    s,
  );
}
