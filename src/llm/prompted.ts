/** Shared annotate/translate logic for providers that answer JSON prompts. */
import {
  buildAnnotationPrompt,
  type EntryStyle,
  type SkipWord,
  parseAnnotation,
  parseTranslation,
  translationSchema,
} from '../core/annotation';
import { LANGUAGES } from '../core/settings';
import type { AnnotatedCue, Cue } from '../core/types';
import { loadFreq } from '../storage/freq';
import { InvalidResponseError, type AnnotateContext } from './types';

/** Ask a model for JSON matching `schema`; resolves to the parsed value. */
export type JsonCompleter = (
  system: string,
  user: string,
  schema: Record<string, unknown>,
) => Promise<unknown>;

export const langName = (code: string): string =>
  (LANGUAGES as Record<string, string>)[code.split('-')[0] ?? code] ?? code;

export async function annotateWithJson(
  complete: JsonCompleter,
  cues: Cue[],
  ctx: AnnotateContext,
  withLineTranslation: boolean,
  style: EntryStyle = 'compact',
): Promise<AnnotatedCue[]> {
  const skip = await commonWords(ctx);
  const p = buildAnnotationPrompt(cues, ctx.context, ctx.lang, {
    langName: langName(ctx.lang),
    nativeName: langName(ctx.nativeLang),
    withLineTranslation,
    style,
    ...(skip ? { skip } : {}),
  });
  const raw = await complete(p.system, p.user, p.schema);
  const out = parseAnnotation(raw, cues, ctx.lang, skip);
  if (!out) {
    throw new InvalidResponseError(
      `Annotation response failed validation. Model said: ${snippet(raw)}`,
    );
  }
  return out;
}

async function commonWords(ctx: AnnotateContext): Promise<SkipWord | undefined> {
  const cutoff = ctx.commonCutoff;
  if (!cutoff) return undefined;
  const freq = await loadFreq(ctx.lang);
  if (!freq) return undefined;
  return (w) => (freq.rank(w.toLocaleLowerCase()) ?? Infinity) <= cutoff;
}

/** Start of a model response, for error messages. Caption text only — never secrets. */
export function snippet(raw: unknown, max = 300): string {
  const s = typeof raw === 'string' ? raw : JSON.stringify(raw);
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export async function translateWithJson(
  complete: JsonCompleter,
  cues: Cue[],
  from: string,
  to: string,
): Promise<Cue[]> {
  const system = `Translate each numbered ${langName(from)} subtitle line into natural, spoken ${langName(to)}. Keep each line about as long as the original so it fits the same timing. Output one entry per line.`;
  const user = cues.map((c, i) => `[${i}] ${c.text}`).join('\n');
  const out = parseTranslation(await complete(system, user, translationSchema()), cues);
  if (!out) throw new InvalidResponseError('Translation response failed validation');
  return out;
}
