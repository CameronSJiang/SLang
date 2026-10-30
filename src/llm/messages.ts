/** Runtime messages between the background worker, content scripts and the offscreen document. */
import type { AnnotatedCue, Cue } from '../core/types';
import type { AnnotationProgress } from './annotator';
import type { TranslationProgress } from './translationJob';
import type { AnnotateContext } from './types';

export const ANNOTATE_PORT = 'slang-annotate';

/** Content script → background, over a port named ANNOTATE_PORT. */
export type AnnotateRequest =
  | { type: 'start'; site: string; videoId: string; lang: string; cues: Cue[]; playhead: number }
  /** Dub mode: translate a source-language transcript into `to`. */
  | {
      type: 'translate';
      site: string;
      videoId: string;
      from: string;
      to: string;
      cues: Cue[];
      playhead: number;
    }
  | { type: 'playhead'; t: number };

/** Background → content script. */
export type AnnotateEvent =
  | { type: 'chunk'; cues: AnnotatedCue[] }
  | { type: 'progress'; progress: AnnotationProgress }
  | { type: 'translated'; cues: Cue[] }
  | { type: 'translateProgress'; progress: TranslationProgress };

/** Background → offscreen document (one-shot messages). */
export type OffscreenRequest = { target: 'offscreen' } & (
  | { op: 'available' }
  | { op: 'annotate'; cues: Cue[]; ctx: AnnotateContext }
  | { op: 'translateCues'; cues: Cue[]; from: string; to: string }
  | { op: 'translateLines'; texts: string[]; from: string; to: string }
);

export type OffscreenResponse =
  | { ok: true; value: unknown }
  | { ok: false; error: string; unavailable?: boolean; invalid?: boolean };
