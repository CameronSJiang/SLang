import { describe, expect, it } from 'vitest';
import { applyEvent, newEntry } from '../src/core/learner';
import {
  buildQuestion,
  buildQuiz,
  normGloss,
  pickQuizWords,
  seededRng,
  type QuizWord,
} from '../src/core/quiz';

const w = (lemma: string, gloss: string, extra: Partial<QuizWord> = {}): QuizWord => ({
  lemma,
  gloss,
  pos: 'NOUN',
  pKnown: 0.7,
  state: 'seen',
  ...extra,
});

const pool: QuizWord[] = [
  w('playa', 'beach'),
  w('perro', 'dog'),
  w('casa', 'house'),
  w('libro', 'book'),
  w('comer', 'to eat', { pos: 'VERB' }),
  w('hola', 'hello', { pKnown: 0.99 }), // too sure: not quizzed
  w('ornitorrinco', 'platypus', { pKnown: 0.05 }), // surely unknown: not quizzed
  w('ya', 'already', { state: 'known' }),
  w('feo', 'ugly', { state: 'ignored' }),
  w('gato', 'cat', { cardId: 'es:gato:v1', due: true, pKnown: 0.2 }),
];

describe('quiz', () => {
  it('normalizes glosses for duplicate detection', () => {
    expect(normGloss('To eat.')).toBe('eat');
    expect(normGloss('The  Beach')).toBe('beach');
  });

  it('picks due saved words and probably-known words only', () => {
    const picked = pickQuizWords(pool, 10, seededRng(1)).map((x) => x.lemma);
    expect(picked).toContain('gato');
    for (const bad of ['hola', 'ornitorrinco', 'ya', 'feo']) expect(picked).not.toContain(bad);
    expect(new Set(picked).size).toBe(picked.length);
  });

  it('builds four distinct choices with the right answer among them', () => {
    const q = buildQuestion(pool[0] as QuizWord, pool, seededRng(2));
    expect(q).not.toBeNull();
    expect(q?.choices).toHaveLength(4);
    expect(q?.choices[q.answer]).toBe('beach');
    expect(new Set(q?.choices.map(normGloss)).size).toBe(4);
  });

  it('prefers distractors with the same part of speech', () => {
    const verbs = [
      w('comer', 'to eat', { pos: 'VERB' }),
      w('beber', 'to drink', { pos: 'VERB' }),
      w('dormir', 'to sleep', { pos: 'VERB' }),
      w('correr', 'to run', { pos: 'VERB' }),
      w('mesa', 'table'),
      w('silla', 'chair'),
    ];
    const q = buildQuestion(verbs[0] as QuizWord, verbs, seededRng(3));
    expect(q?.choices.every((c) => c.startsWith('to '))).toBe(true);
  });

  it('skips a question when there are not enough distinct meanings', () => {
    const tiny = [w('a', 'x'), w('b', 'X.'), w('c', 'y')];
    expect(buildQuestion(tiny[0] as QuizWord, tiny, seededRng(4))).toBeNull();
    expect(buildQuiz(tiny, 3, seededRng(4))).toEqual([]);
  });

  it('quiz answers move pKnown', () => {
    const e = newEntry('playa', 'es', 0.6, 0);
    expect(applyEvent(e, 'quiz-right', 1).pKnown).toBeCloseTo(0.84);
    const wrong = applyEvent({ ...e, state: 'known', pKnown: 1 }, 'quiz-wrong', 1);
    expect(wrong.pKnown).toBeCloseTo(0.35);
    expect(wrong.state).toBe('learning');
  });
});
