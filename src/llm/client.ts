/** Content-script side of annotation: asks the background to annotate a transcript and streams results back. */
import { browser } from 'wxt/browser';
import type { AnnotatedCue, Cue } from '../core/types';
import type { AnnotationProgress } from './annotator';
import { ANNOTATE_PORT, type AnnotateEvent, type AnnotateRequest } from './messages';

export interface AnnotationClient {
  setPlayhead(t: number): void;
  stop(): void;
}

export function requestAnnotation(
  req: { site: string; videoId: string; lang: string; cues: Cue[]; playhead: number },
  on: { chunk(cues: AnnotatedCue[]): void; progress(p: AnnotationProgress): void },
): AnnotationClient {
  const port = browser.runtime.connect({ name: ANNOTATE_PORT });
  let open = true;
  port.onDisconnect.addListener(() => (open = false));
  port.onMessage.addListener((e: AnnotateEvent) => {
    if (e.type === 'chunk') on.chunk(e.cues);
    else on.progress(e.progress);
  });
  const send = (m: AnnotateRequest) => {
    if (!open) return;
    try {
      port.postMessage(m);
    } catch {
      open = false; // extension reloaded under this tab
    }
  };
  send({ type: 'start', ...req });
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
