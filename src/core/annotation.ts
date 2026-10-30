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

export interface PromptOptions {
  /** Language names, e.g. "Spanish" / "English". */
  langName: string;
  nativeName: string;
  /** Ask for a full-line translation per cue too. */
  withLineTranslation: boolean;
}

export function annotationSchema(withLineTranslation: boolean): Record<string, unknown> {
  const line: Record<string, unknown> = {
    type: 'object',
    additionalProperties: false,
    required: withLineTranslation ? ['i', 't', 'w'] : ['i', 'w'],
    properties: {
      i: { type: 'integer' },
      ...(withLineTranslation ? { t: { type: 'string' } } : {}),
      w: { type: 'array', items: { type: 'string' } },
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
  const { langName, nativeName, withLineTranslation } = opts;
  const system = [
    `You annotate ${langName} subtitles for a ${nativeName}-speaking language learner.`,
    `For every listed word, in order, output one string "surface|lemma|POS|gloss":`,
    `surface = the word exactly as listed; lemma = its dictionary form in ${langName};`,
    `POS = one Universal Dependencies tag (${UPOS.join(', ')});`,
    `gloss = a short ${nativeName} meaning (1-3 words) that fits THIS sentence.`,
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
      const words = tokenize(c.text, lang).map((w) => w.surface);
      return `[${i}] ${c.text}\nwords: ${words.join(' · ')}`;
    })
    .join('\n');
  return {
    system,
    user: `${contextText}Lines:\n${lines}`,
    schema: annotationSchema(withLineTranslation),
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

/** Align `surface|lemma|POS|gloss` entries onto spans, tolerating skipped or extra entries. */
function alignWords(spans: WordSpan[], entries: unknown[]): { tokens: Token[]; hits: number } {
  const parsed = entries
    .filter((e): e is string => typeof e === 'string')
    .map((e) => e.split('|').map((p) => p.trim()))
    .filter((p) => p.length >= 4 && p[0]);
  let j = 0;
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
        gloss: p.slice(3).join('|'),
        start: w.start,
        end: w.end,
      };
    }
    return bareToken(w);
  });
  return { tokens, hits };
}

/**
 * Validate a model response and merge it onto `cues`. Returns null when the
 * response is malformed or covers too few words (caller retries / falls back).
 */
export function parseAnnotation(
  raw: unknown,
  cues: readonly Cue[],
  lang: string,
): AnnotatedCue[] | null {
  const lines = (raw as { lines?: unknown } | null)?.lines;
  if (!Array.isArray(lines)) return null;
  const byIndex = new Map<number, { t?: unknown; w?: unknown }>();
  for (const l of lines) {
    if (l && typeof l === 'object' && Number.isInteger((l as { i?: unknown }).i)) {
      byIndex.set((l as { i: number }).i, l as { t?: unknown; w?: unknown });
    }
  }
  let words = 0;
  let hits = 0;
  const out = cues.map((cue, i) => {
    const spans = tokenize(cue.text, lang);
    const line = byIndex.get(i);
    const aligned = alignWords(spans, Array.isArray(line?.w) ? line.w : []);
    words += spans.length;
    hits += aligned.hits;
    const l1 = typeof line?.t === 'string' && line.t.trim() ? line.t.trim() : undefined;
    return { ...cue, tokens: aligned.tokens, ...(l1 ? { l1 } : {}) };
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
