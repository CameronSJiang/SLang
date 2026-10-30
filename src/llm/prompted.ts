/** Shared annotate/translate logic for providers that answer JSON prompts. */
import {
  buildAnnotationPrompt,
  parseAnnotation,
  parseTranslation,
  translationSchema,
} from '../core/annotation';
import { LANGUAGES } from '../core/settings';
import type { AnnotatedCue, Cue } from '../core/types';
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
): Promise<AnnotatedCue[]> {
  const p = buildAnnotationPrompt(cues, ctx.context, ctx.lang, {
    langName: langName(ctx.lang),
    nativeName: langName(ctx.nativeLang),
    withLineTranslation,
  });
  const out = parseAnnotation(await complete(p.system, p.user, p.schema), cues, ctx.lang);
  if (!out) throw new InvalidResponseError('Annotation response failed validation');
  return out;
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
