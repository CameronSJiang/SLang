import type { LLMProviderId } from '../core/settings';
import type { AnnotatedCue, Cue } from '../core/types';

export interface AnnotateContext {
  /** Caption language (BCP-47) and learner's native language. */
  lang: string;
  nativeLang: string;
  /** Preceding cues, sent for meaning only. */
  context: Cue[];
}

export interface LLMProvider {
  readonly id: LLMProviderId;
  /** Cues per annotate() call this provider handles well. */
  readonly chunkSize: number;
  available(): Promise<boolean>;
  /** Throws on failure; the annotator retries once, then falls back to Null. */
  annotate(cues: Cue[], ctx: AnnotateContext): Promise<AnnotatedCue[]>;
  translateLine(text: string, from: string, to: string): Promise<string>;
  translateCues(cues: Cue[], from: string, to: string): Promise<Cue[]>;
}

/** The provider can't serve any more requests (bad key, model gone): skip it for the rest of the job. */
export class ProviderUnavailableError extends Error {
  override name = 'ProviderUnavailableError';
}

/** Retryable: the response was malformed or failed validation. */
export class InvalidResponseError extends Error {
  override name = 'InvalidResponseError';
}
