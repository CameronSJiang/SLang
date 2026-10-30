import { describe, expect, it } from 'vitest';
import { selectGlosses, type WordInfo } from '../src/core/glossPolicy';
import { priorPKnown } from '../src/core/learner';
import type { Token } from '../src/core/types';

// "María compró 3 manzanas y un aguacate en el mercado"
const t = (surface: string, lemma: string, pos: string, gloss = 'g'): Token => ({
  surface,
  lemma,
  pos,
  gloss,
  start: 0,
  end: 0,
});
const tokens = [
  t('María', 'maría', 'PROPN'),
  t('compró', 'comprar', 'VERB'),
  t('3', '3', 'NUM'),
  t('manzanas', 'manzana', 'NOUN'),
  t('y', 'y', 'CCONJ'),
  t('un', 'uno', 'DET'),
  t('aguacate', 'aguacate', 'NOUN'),
  t('en', 'en', 'ADP'),
  t('el', 'el', 'DET'),
  t('mercado', 'mercado', 'NOUN'),
];
const ranks: Record<string, number> = {
  maría: 900,
  comprar: 1200,
  '3': 1,
  manzana: 4500,
  y: 6,
  uno: 10,
  aguacate: 15000,
  en: 5,
  el: 4,
  mercado: 1800,
};

const profile =
  (vocab: number, overrides: Record<string, Partial<WordInfo>> = {}) =>
  (lemma: string): WordInfo => {
    const rank = ranks[lemma] ?? 40000;
    return {
      pKnown: priorPKnown(rank, vocab),
      state: 'new',
      custom: false,
      rank,
      ...overrides[lemma],
    };
  };

const words = (idx: number[]) => idx.map((i) => tokens[i]!.surface);

describe('selectGlosses', () => {
  it('beginners get more glosses than advanced learners on the same line', () => {
    const beginner = words(selectGlosses(tokens, profile(500), 'high'));
    const advanced = words(selectGlosses(tokens, profile(8000), 'high'));
    expect(beginner).toEqual(['compró', 'manzanas', 'mercado']);
    expect(advanced).toEqual(['aguacate']);
  });

  it('caps per density and prefers mid-frequency over rare', () => {
    expect(words(selectGlosses(tokens, profile(500), 'low'))).toEqual(['compró']);
    expect(words(selectGlosses(tokens, profile(500), 'med'))).toEqual(['compró', 'mercado']);
  });

  it('always includes custom targets first, and skips known/ignored/proper nouns/numbers', () => {
    const info = profile(500, {
      aguacate: { custom: true, state: 'learning' },
      comprar: { state: 'known' },
      mercado: { state: 'ignored' },
    });
    expect(words(selectGlosses(tokens, info, 'low'))).toEqual(['aguacate']);
    expect(words(selectGlosses(tokens, info, 'high'))).toEqual(['manzanas', 'aguacate']);
    expect(words(selectGlosses(tokens, profile(1), 'high'))).not.toContain('María');
  });

  it('skips words without a gloss (Null provider)', () => {
    expect(
      selectGlosses(
        tokens.map((x) => ({ ...x, gloss: '' })),
        profile(500),
        'high',
      ),
    ).toEqual([]);
  });
});
