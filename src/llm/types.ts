import type { LLMProviderId } from '../core/settings';
import type { AnnotatedCue, Cue } from '../core/types';

export interface AnnotateContext {
  /** Caption language (BCP-47) and learner's native language. */
  lang: string;
  nativeLang: string;
  /** Preceding cues, sent for meaning only. */
  context: Cue[];
  /** Line translations already exist (from translateLines); only annotate words. */
  skipLineTranslation?: boolean;
  /**
   * Don't ask the model about words ranked at or above this in the frequency
   * list (they're known to almost everyone). Speeds up slow on-device models.
   */
  commonCutoff?: number;
}

export interface LLMProvider {
  readonly id: LLMProviderId;
  /** Cues per annotate() call this provider handles well. */
  readonly chunkSize: number;
  /** Skip asking about the N most common words (slow models); see AnnotateContext.commonCutoff. */
  readonly commonCutoff?: number;
  available(): Promise<boolean>;
  /** Throws on failure; the annotator retries once, then falls back to Null. */
  annotate(cues: Cue[], ctx: AnnotateContext): Promise<AnnotatedCue[]>;
  translateLine(text: string, from: string, to: string): Promise<string>;
  translateCues(cues: Cue[], from: string, to: string): Promise<Cue[]>;
  /**
   * Optional fast path for full-line translation (e.g. Chrome's Translator
   * API), run over the whole transcript before the slower word pass.
   */
  translateLines?(texts: string[], from: string, to: string): Promise<string[]>;
}

/** The provider can't serve any more requests (bad key, model gone): skip it for the rest of the job. */
export class ProviderUnavailableError extends Error {
  override name = 'ProviderUnavailableError';
}

/** Retryable: the response was malformed or failed validation. */
export class InvalidResponseError extends Error {
  override name = 'InvalidResponseError';
}
