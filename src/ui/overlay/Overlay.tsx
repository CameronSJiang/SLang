import { useEffect, useRef, useState } from 'preact/hooks';
import type { CaptionState } from '../../adapters/types';
import type { AnnotationProgress } from '../../llm/annotator';
import { findCueIndex } from '../../core/cueIndex';
import { CAPTION_POSITION_RANGE, LANGUAGES, type Settings } from '../../core/settings';
import type { AnnotatedCue, Cue } from '../../core/types';

export interface OverlayProps {
  state: CaptionState;
  video: HTMLVideoElement | null;
  settings: Pick<
    Settings,
    'targetLang' | 'nativeLang' | 'captionFontSize' | 'captionHighContrast' | 'captionPosition'
  >;
  /** Called once when a drag ends, with the new position (% from bottom). */
  onMove(position: number): void;
  /** Annotations by cue id (M2). */
  annotations?: ReadonlyMap<string, AnnotatedCue>;
  ai?: AnnotationProgress | null;
}

function aiMessage(ai: AnnotationProgress | null | undefined): string | null {
  if (!ai) return null;
  if (ai.error) return `Translations unavailable: ${ai.error}. Check SLang settings.`;
  if (ai.provider === 'null')
    return 'Translations are off. Set up an AI provider in SLang settings.';
  if (!ai.finished && ai.total) {
    const pct = Math.floor((ai.done / ai.total) * 100);
    // Lines come first and fast; word meanings (used from M3 on) fill in slowly after.
    return ai.phase === 'lines'
      ? `Translating lines… ${pct}%`
      : `Line translations ready · word meanings ${pct}%`;
  }
  return null;
}

/** Index of the cue under the playhead, updated every presented frame. */
function useActiveCue(video: HTMLVideoElement | null, cues: Cue[]): number {
  const [index, setIndex] = useState(-1);
  useEffect(() => {
    if (!video) return;
    const update = () => setIndex(findCueIndex(cues, video.currentTime));
    let handle = 0;
    let stopped = false;
    const hasRvfc = 'requestVideoFrameCallback' in video;
    const onFrame = () => {
      update();
      if (!stopped) handle = video.requestVideoFrameCallback(onFrame);
    };
    if (hasRvfc) handle = video.requestVideoFrameCallback(onFrame);
    // timeupdate covers browsers without rVFC; seeked covers seeks while paused.
    const events = ['timeupdate', 'seeked', 'loadeddata'] as const;
    events.forEach((e) => video.addEventListener(e, update));
    update();
    return () => {
      stopped = true;
      if (hasRvfc && handle) video.cancelVideoFrameCallback(handle);
      events.forEach((e) => video.removeEventListener(e, update));
    };
  }, [video, cues]);
  return index;
}

const clampPos = (p: number) =>
  Math.min(CAPTION_POSITION_RANGE[1], Math.max(CAPTION_POSITION_RANGE[0], p));

const stop = (e: Event) => e.stopPropagation();

export function Overlay({ state, video, settings, onMove, annotations, ai }: OverlayProps) {
  const index = useActiveCue(video, state.cues);
  const rootRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ startY: number; startPos: number; pos: number } | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [aiDismissed, setAiDismissed] = useState<string | null>(null);

  if (state.ad) return null;

  const cue = index >= 0 ? state.cues[index] : undefined;
  const position = drag?.pos ?? settings.captionPosition;
  const langName = LANGUAGES[settings.targetLang];
  const showNotice = state.status === 'no-target' || state.status === 'no-captions';
  const l1 = cue ? annotations?.get(cue.id)?.l1 : undefined;
  const aiText = aiMessage(ai);
  // Progress clears itself; problems can be dismissed per video.
  const showAi =
    !!aiText && (!ai?.error && ai?.provider !== 'null' ? true : aiDismissed !== state.videoId);

  const onPointerDown = (e: PointerEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({
      startY: e.clientY,
      startPos: settings.captionPosition,
      pos: settings.captionPosition,
    });
  };
  const onPointerMove = (e: PointerEvent) => {
    const height = rootRef.current?.clientHeight;
    if (!drag || !height) return;
    setDrag({ ...drag, pos: clampPos(drag.startPos + ((drag.startY - e.clientY) / height) * 100) });
  };
  const onPointerUp = () => {
    if (!drag) return;
    if (drag.pos !== drag.startPos) onMove(Math.round(drag.pos * 10) / 10);
    setDrag(null);
  };

  return (
    <div ref={rootRef} class={`root${settings.captionHighContrast ? ' hc' : ''}`}>
      {showNotice && dismissed !== state.videoId && (
        <div class="notice" onClick={stop} onMouseDown={stop} onDblClick={stop}>
          {state.status === 'no-target'
            ? `No ${langName} captions for this video.`
            : 'No captions found for this video.'}
          <button aria-label="Dismiss" onClick={() => setDismissed(state.videoId)}>
            ×
          </button>
        </div>
      )}
      {showAi && (
        <div class="ai" onClick={stop} onMouseDown={stop} onDblClick={stop}>
          {aiText}
          {(ai?.error || ai?.provider === 'null') && (
            <button aria-label="Dismiss" onClick={() => setAiDismissed(state.videoId)}>
              ×
            </button>
          )}
        </div>
      )}
      {cue && (
        <div
          class={`box${drag ? ' dragging' : ''}`}
          lang={state.lang ?? settings.targetLang}
          style={{ bottom: `${position}%`, fontSize: `${settings.captionFontSize}px` }}
          title="Drag to move"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onMouseDown={stop}
          onClick={stop}
          onDblClick={stop}
        >
          {cue.text}
          {l1 && (
            <div class="l1" lang={settings.nativeLang}>
              {l1}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
