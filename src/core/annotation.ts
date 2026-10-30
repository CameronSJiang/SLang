/**
 * Prompt + response contract for LLM annotation. Words are segmented by us
 * (see tokenize.ts) and sent numbered; the model returns one compact
 * `surface|lemma|POS|gloss` string per word, which we align back onto our
 * own spans, so offsets never depend on the model.
 */
import { tokenize, type WordSpan } from './tokenize';
import type { AnnotatedCue, Cue, Token } from './types';

/** Universal Dependencies POS tags. */
export const UPOS = [
  'ADJ', 'ADP', 'ADV', 'AUX', 'CCONJ', 'DET', 'INTJ', 'NOUN', 'NUM',
  'PART', 'PRON', 'PROPN', 'PUNCT', 'SCONJ', 'SYM', 'VERB', 'X',
] as const; // prettier-ignore

/** Below this share of words annotated, a response counts as a failure. */
export const MIN_COVERAGE = 0.6;

export interface AnnotationPrompt {
  system: string;
  user: string;
  schema: Record<string, unknown>;
}

/** Words the model doesn't need to annotate (very common words); they keep bare tokens. */
export type SkipWord = (surface: string) => boolean;

export interface PromptOptions {
  skip?: SkipWord;
  /** Language names, e.g. "Spanish" / "English". */
  langName: string;
  nativeName: string;
  /** Ask for a full-line translation per cue too. */
  withLineTranslation: boolean;
  /**
   * compact: one "surface|lemma|POS|gloss" string per word (fewest output tokens).
   * object: one {s,l,p,g} object per word, so a schema-constrained small model
   * (Gemini Nano) can't get the format wrong.
   */
  style?: EntryStyle;
}

export type EntryStyle = 'compact' | 'object';

const OBJECT_ENTRY = {
  type: 'object',
  additionalProperties: false,
  required: ['s', 'l', 'p', 'g'],
  properties: {
    s: { type: 'string' },
    l: { type: 'string' },
    p: { type: 'string', enum: UPOS },
    g: { type: 'string' },
  },
};

export function annotationSchema(
  withLineTranslation: boolean,
  style: EntryStyle = 'compact',
): Record<string, unknown> {
  const line: Record<string, unknown> = {
    type: 'object',
    additionalProperties: false,
    required: withLineTranslation ? ['i', 't', 'w'] : ['i', 'w'],
    properties: {
      i: { type: 'integer' },
      ...(withLineTranslation ? { t: { type: 'string' } } : {}),
      w: { type: 'array', items: style === 'object' ? OBJECT_ENTRY : { type: 'string' } },
    },
  };
  return {
    type: 'object',
    additionalProperties: false,
    required: ['lines'],
    properties: { lines: { type: 'array', items: line } },
  };
}

export function buildAnnotationPrompt(
  cues: readonly Cue[],
  context: readonly Cue[],
  lang: string,
  opts: PromptOptions,
): AnnotationPrompt {
  const { langName, nativeName, withLineTranslation, style = 'compact' } = opts;
  const fields =
    style === 'object'
      ? [
          `For every listed word, in order, output an object in "w":`,
          `s = the word exactly as listed; l = its dictionary form in ${langName};`,
          `p = its Universal Dependencies part-of-speech tag;`,
          `g = a short ${nativeName} meaning (1-3 words) that fits THIS sentence.`,
          `"i" is the line number shown in brackets. Output exactly one object per bracketed line,`,
          `with ALL of that line's words in its "w" array.`,
        ]
      : [
          `For every listed word, in order, output one string "surface|lemma|POS|gloss":`,
          `surface = the word exactly as listed; lemma = its dictionary form in ${langName};`,
          `POS = one Universal Dependencies tag (${UPOS.join(', ')});`,
          `gloss = a short ${nativeName} meaning (1-3 words) that fits THIS sentence.`,
        ];
  const system = [
    `You annotate ${langName} subtitles for a ${nativeName}-speaking language learner.`,
    ...fields,
    withLineTranslation
      ? `Also give "t": a natural ${nativeName} translation of the whole line.`
      : '',
    'Use the context lines only to understand meaning; do not annotate them.',
  ]
    .filter(Boolean)
    .join('\n');
  const contextText = context.length
    ? `Context:\n${context.map((c) => `> ${c.text}`).join('\n')}\n\n`
    : '';
  const lines = cues
    .map((c, i) => {
      const words = tokenize(c.text, lang)
        .map((w) => w.surface)
        .filter((w) => !opts.skip?.(w));
      return `[${i}] ${c.text}\nwords: ${words.length ? words.join(' · ') : '(none)'}`;
    })
    .join('\n');
  return {
    system,
    user: `${contextText}Lines:\n${lines}`,
    schema: annotationSchema(withLineTranslation, style),
  };
}

function fold(s: string): string {
  return s.toLocaleLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function bareToken(w: WordSpan): Token {
  return {
    surface: w.surface,
    lemma: w.surface.toLocaleLowerCase(),
    pos: 'X',
    gloss: '',
    start: w.start,
    end: w.end,
  };
}

const UPOS_SET = new Set<string>(UPOS);

/** Either entry style as [surface, lemma, pos, gloss], or null if unusable. */
function entryParts(e: unknown): string[] | null {
  if (typeof e === 'string') {
    const p = e.split('|').map((x) => x.trim());
    return p.length >= 4 && p[0] ? [p[0], p[1] ?? '', p[2] ?? '', p.slice(3).join('|')] : null;
  }
  const o = e as { s?: unknown; l?: unknown; p?: unknown; g?: unknown } | null;
  if (!o || typeof o !== 'object' || typeof o.s !== 'string' || !o.s.trim()) return null;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  return [o.s.trim(), str(o.l), str(o.p), str(o.g)];
}

/**
 * Align parsed entries onto spans starting at `from`, tolerating skipped or
 * extra entries. Returns where the next span's search should start.
 */
function alignWords(
  spans: WordSpan[],
  parsed: string[][],
  from = 0,
): { tokens: Token[]; hits: number; next: number } {
  let j = from;
  let hits = 0;
  const tokens = spans.map((w) => {
    // Look a few entries ahead for this surface, so one skipped word doesn't shift the rest.
    for (let k = j; k < Math.min(parsed.length, j + 3); k++) {
      const p = parsed[k] as string[];
      if (fold(p[0] as string) !== fold(w.surface)) continue;
      j = k + 1;
      hits++;
      const pos = (p[2] as string).toUpperCase();
      return {
        surface: w.surface,
        lemma: (p[1] as string) || w.surface.toLocaleLowerCase(),
        pos: UPOS_SET.has(pos) ? pos : 'X',
        gloss: p[3] ?? '',
        start: w.start,
        end: w.end,
      };
    }
    return bareToken(w);
  });
  return { tokens, hits, next: j };
}

const entriesOf = (w: unknown): string[][] =>
  Array.isArray(w) ? w.map(entryParts).filter((p): p is string[] => p !== null) : [];

/**
 * Validate a model response and merge it onto `cues`. Returns null when the
 * response is malformed or covers too few words (caller retries / falls back).
 */
export function parseAnnotation(
  raw: unknown,
  cues: readonly Cue[],
  lang: string,
  skip?: SkipWord,
): AnnotatedCue[] | null {
  const lines = (raw as { lines?: unknown } | null)?.lines;
  if (!Array.isArray(lines)) return null;
  type Line = { i?: unknown; t?: unknown; w?: unknown };
  const objs = lines.filter((l): l is Line => !!l && typeof l === 'object');
  const byIndex = new Map<number, Line>();
  for (const l of objs) if (Number.isInteger(l.i)) byIndex.set(l.i as number, l);
  // Small models sometimes number from 1 or drop "i": fall back to order when counts match.
  if (cues.some((_, i) => !byIndex.has(i)) && objs.length === cues.length) {
    byIndex.clear();
    objs.forEach((l, i) => byIndex.set(i, l));
  }
  // If the model split lines differently (Gemini Nano likes one "line" per word),
  // ignore its line structure and align all words in order across the chunk.
  const perLine = objs.length === cues.length && cues.every((_, i) => byIndex.has(i));
  const flat = perLine ? [] : objs.flatMap((l) => entriesOf(l.w));
  let cursor = 0;
  let words = 0;
  let hits = 0;
  const out = cues.map((cue, i) => {
    const spans = tokenize(cue.text, lang);
    const asked = spans.filter((w) => !skip?.(w.surface));
    const line = perLine ? byIndex.get(i) : undefined;
    const aligned = perLine
      ? alignWords(asked, entriesOf(line?.w))
      : alignWords(asked, flat, cursor);
    cursor = aligned.next;
    words += asked.length;
    hits += aligned.hits;
    // Merge back: skipped words keep bare tokens, in original order.
    let k = 0;
    const tokens = spans.map((w) =>
      skip?.(w.surface) ? bareToken(w) : (aligned.tokens[k++] as Token),
    );
    const l1 = typeof line?.t === 'string' && line.t.trim() ? line.t.trim() : undefined;
    return { ...cue, tokens, ...(l1 ? { l1 } : {}) };
  });
  return words === 0 || hits / words >= MIN_COVERAGE ? out : null;
}

/** Tokens only, no glosses: the Null provider and the last-resort fallback. */
export function nullAnnotate(cues: readonly Cue[], lang: string): AnnotatedCue[] {
  return cues.map((c) => ({ ...c, tokens: tokenize(c.text, lang).map(bareToken) }));
}

/** Translation response contract (used by translateCues / dub mode). */
export function translationSchema(): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['lines'],
    properties: {
      lines: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['i', 't'],
          properties: { i: { type: 'integer' }, t: { type: 'string' } },
        },
      },
    },
  };
}

export function parseTranslation(raw: unknown, cues: readonly Cue[]): Cue[] | null {
  const lines = (raw as { lines?: unknown } | null)?.lines;
  if (!Array.isArray(lines)) return null;
  const byIndex = new Map<number, string>();
  for (const l of lines as { i?: unknown; t?: unknown }[]) {
    if (Number.isInteger(l?.i) && typeof l.t === 'string') byIndex.set(l.i as number, l.t.trim());
  }
  if (cues.some((_, i) => !byIndex.get(i))) return null;
  return cues.map((c, i) => ({ ...c, text: byIndex.get(i) as string }));
}

/** Stable fingerprint of a transcript, to detect when a cached annotation is stale. */
export function hashCues(cues: readonly Cue[]): string {
  let h = 0x811c9dc5;
  for (const c of cues) {
    const s = `${c.start.toFixed(2)}\u0001${c.text}\u0002`;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
  }
  return `${cues.length}:${(h >>> 0).toString(36)}`;
}
