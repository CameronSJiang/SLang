import { describe, expect, it } from 'vitest';
import {
  buildAnnotationPrompt,
  hashCues,
  nullAnnotate,
  parseAnnotation,
  parseTranslation,
} from '../src/core/annotation';

const cues = [
  { id: 'c0', start: 0, end: 2, text: 'Hola a todos.' },
  { id: 'c1', start: 2, end: 4, text: 'Tengo un perro.' },
];
const opts = { langName: 'Spanish', nativeName: 'English', withLineTranslation: true };

describe('buildAnnotationPrompt', () => {
  it('numbers lines, lists our words, and includes context', () => {
    const p = buildAnnotationPrompt(
      cues,
      [{ id: 'x', start: 0, end: 0, text: 'Antes.' }],
      'es',
      opts,
    );
    expect(p.user).toContain('> Antes.');
    expect(p.user).toContain('[1] Tengo un perro.\nwords: Tengo · un · perro');
    expect(JSON.stringify(p.schema)).toContain('"t"');
    expect(
      JSON.stringify(
        buildAnnotationPrompt(cues, [], 'es', { ...opts, withLineTranslation: false }).schema,
      ),
    ).not.toContain('"t"');
  });
});

describe('parseAnnotation', () => {
  it('aligns entries onto our spans and keeps offsets', () => {
    const out = parseAnnotation(
      {
        lines: [
          {
            i: 0,
            t: 'Hi everyone.',
            w: ['Hola|hola|INTJ|hi', 'a|a|ADP|to', 'todos|todo|PRON|everyone'],
          },
          {
            i: 1,
            t: 'I have a dog.',
            w: ['tengo|tener|VERB|I have', 'un|uno|DET|a', 'perro|perro|NOUN|dog'],
          },
        ],
      },
      cues,
      'es',
    );
    expect(out?.[1]?.tokens[0]).toEqual({
      surface: 'Tengo',
      lemma: 'tener',
      pos: 'VERB',
      gloss: 'I have',
      start: 0,
      end: 5,
    });
    expect(out?.[0]?.l1).toBe('Hi everyone.');
  });

  it('tolerates a skipped word and bad POS without shifting the rest', () => {
    const out = parseAnnotation(
      {
        lines: [
          { i: 0, w: ['Hola|hola|INTJ|hi', 'todos|todo|PRON|everyone'] },
          { i: 1, w: ['Tengo|tener|VERB|I have', 'un|uno|DETERMINER|a', 'perro|perro|NOUN|dog'] },
        ],
      },
      cues,
      'es',
    );
    expect(out?.[0]?.tokens.map((t) => t.gloss)).toEqual(['hi', '', 'everyone']);
    expect(out?.[1]?.tokens[1]?.pos).toBe('X');
  });

  it('accepts object entries and lines numbered from 1', () => {
    const out = parseAnnotation(
      {
        lines: [
          {
            i: 1,
            w: [
              { s: 'Hola', l: 'hola', p: 'INTJ', g: 'hi' },
              { s: 'a', l: 'a', p: 'ADP', g: 'to' },
              { s: 'todos', l: 'todo', p: 'PRON', g: 'all' },
            ],
          },
          {
            i: 2,
            w: [
              { s: 'Tengo', l: 'tener', p: 'VERB', g: 'I have' },
              { s: 'un', l: 'uno', p: 'DET', g: 'a' },
              { s: 'perro', l: 'perro', p: 'NOUN', g: 'dog' },
            ],
          },
        ],
      },
      cues,
      'es',
    );
    expect(out?.[0]?.tokens[2]?.gloss).toBe('all');
    expect(out?.[1]?.tokens[0]).toMatchObject({ lemma: 'tener', pos: 'VERB', start: 0, end: 5 });
  });

  it('recovers when a small model puts each word on its own "line"', () => {
    const words = [
      ['Hola', 'hola', 'INTJ', 'hi'],
      ['a', 'a', 'ADP', 'to'],
      ['todos', 'todo', 'PRON', 'all'],
      ['Tengo', 'tener', 'VERB', 'I have'],
      ['un', 'uno', 'DET', 'a'],
      ['perro', 'perro', 'NOUN', 'dog'],
    ];
    const out = parseAnnotation(
      { lines: words.map(([s, l, p, g], i) => ({ i, w: [{ s, l, p, g }] })) },
      cues,
      'es',
    );
    expect(out?.map((c) => c.tokens.map((t) => t.gloss))).toEqual([
      ['hi', 'to', 'all'],
      ['I have', 'a', 'dog'],
    ]);
  });

  it('object-style prompts constrain each word', () => {
    const p = buildAnnotationPrompt(cues, [], 'es', { ...opts, style: 'object' });
    expect(JSON.stringify(p.schema)).toContain('"required":["s","l","p","g"]');
    expect(p.system).toContain('s = the word exactly as listed');
  });

  it('rejects malformed or low-coverage responses', () => {
    expect(parseAnnotation({ nope: 1 }, cues, 'es')).toBeNull();
    expect(parseAnnotation({ lines: [{ i: 0, w: ['Hola|hola|INTJ|hi'] }] }, cues, 'es')).toBeNull();
  });
});

describe('helpers', () => {
  it('nullAnnotate gives tokens with empty glosses', () => {
    expect(nullAnnotate(cues, 'es')[1]?.tokens.map((t) => [t.lemma, t.gloss])).toEqual([
      ['tengo', ''],
      ['un', ''],
      ['perro', ''],
    ]);
  });

  it('parseTranslation requires every line', () => {
    expect(
      parseTranslation(
        {
          lines: [
            { i: 0, t: 'a' },
            { i: 1, t: 'b' },
          ],
        },
        cues,
      )?.[1]?.text,
    ).toBe('b');
    expect(parseTranslation({ lines: [{ i: 0, t: 'a' }] }, cues)).toBeNull();
  });

  it('hashCues changes with text', () => {
    expect(hashCues(cues)).toBe(hashCues([...cues]));
    expect(hashCues(cues)).not.toBe(hashCues([cues[0]!, { ...cues[1]!, text: 'x' }]));
  });
});

describe('skipping common words', () => {
  const skip = (w: string) => ['a', 'un'].includes(w.toLowerCase());
  it('leaves common words out of the prompt and keeps them as bare tokens', () => {
    const p = buildAnnotationPrompt(cues, [], 'es', { ...opts, skip });
    expect(p.user).toContain('words: Hola · todos');
    expect(p.user).toContain('words: Tengo · perro');
    const out = parseAnnotation(
      {
        lines: [
          { i: 0, t: 'x', w: ['Hola|hola|INTJ|hi', 'todos|todo|PRON|all'] },
          { i: 1, t: 'y', w: ['Tengo|tener|VERB|I have', 'perro|perro|NOUN|dog'] },
        ],
      },
      cues,
      'es',
      skip,
    );
    expect(out?.[1]?.tokens.map((t) => [t.surface, t.gloss])).toEqual([
      ['Tengo', 'I have'],
      ['un', ''],
      ['perro', 'dog'],
    ]);
  });
});
