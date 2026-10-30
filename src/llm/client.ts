/** Content-script side of annotation and dub translation: jobs run in the background, results stream back. */
import { browser } from 'wxt/browser';
import type { AnnotatedCue, Cue } from '../core/types';
import type { AnnotationProgress } from './annotator';
import { ANNOTATE_PORT, type AnnotateEvent, type AnnotateRequest } from './messages';
import type { TranslationProgress } from './translationJob';

export interface AnnotationClient {
  setPlayhead(t: number): void;
  stop(): void;
}

function connect(first: AnnotateRequest, onEvent: (e: AnnotateEvent) => void): AnnotationClient {
  const port = browser.runtime.connect({ name: ANNOTATE_PORT });
  let open = true;
  port.onDisconnect.addListener(() => (open = false));
  port.onMessage.addListener(onEvent);
  const send = (m: AnnotateRequest) => {
    if (!open) return;
    try {
      port.postMessage(m);
    } catch {
      open = false; // extension reloaded under this tab
    }
  };
  send(first);
  return {
    setPlayhead: (t) => send({ type: 'playhead', t }),
    stop: () => {
      open = false;
      try {
        port.disconnect();
      } catch {
        // already gone
      }
    },
  };
}

export function requestAnnotation(
  req: { site: string; videoId: string; lang: string; cues: Cue[]; playhead: number },
  on: { chunk(cues: AnnotatedCue[]): void; progress(p: AnnotationProgress): void },
): AnnotationClient {
  return connect({ type: 'start', ...req }, (e) => {
    if (e.type === 'chunk') on.chunk(e.cues);
    else if (e.type === 'progress') on.progress(e.progress);
  });
}

/** Dub mode: translate a source transcript into the target language, streamed back in chunks. */
export function requestTranslation(
  req: { site: string; videoId: string; from: string; to: string; cues: Cue[]; playhead: number },
  on: { cues(cues: Cue[]): void; progress(p: TranslationProgress): void },
): AnnotationClient {
  return connect({ type: 'translate', ...req }, (e) => {
    if (e.type === 'translated') on.cues(e.cues);
    else if (e.type === 'translateProgress') on.progress(e.progress);
  });
}
