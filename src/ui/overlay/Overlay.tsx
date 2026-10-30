import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { CaptionState } from '../../adapters/types';
import type { AnnotationProgress } from '../../llm/annotator';
import { findCueIndex } from '../../core/cueIndex';
import { selectGlosses, type WordInfo } from '../../core/glossPolicy';
import { CAPTION_POSITION_RANGE, LANGUAGES, type Settings } from '../../core/settings';
import type { AnnotatedCue, Cue, Token } from '../../core/types';
import { Caption } from './Caption';
import { WordPopover, type WordAction } from './WordPopover';

/** A cue must be on screen this long (video time) without a lookup to count as exposure. */
const EXPOSURE_MIN_S = 1.5;
/** Pointer movement (px) that turns a press into a drag instead of a word click. */
const DRAG_SLOP = 4;

export interface OverlayProps {
  state: CaptionState;
  video: HTMLVideoElement | null;
  settings: Pick<
    Settings,
    | 'targetLang'
    | 'nativeLang'
    | 'captionFontSize'
    | 'captionHighContrast'
    | 'captionPosition'
    | 'glossDensity'
  >;
  /** Called once when a drag ends, with the new position (% from bottom). */
  onMove(position: number): void;
  /** Annotations by cue id (M2). */
  annotations?: ReadonlyMap<string, AnnotatedCue>;
  ai?: AnnotationProgress | null;
  /** Learner info per lemma (M3); undefined while loading. */
  wordInfo?: (lemma: string) => WordInfo | undefined;
  onWord?(action: WordAction, cue: AnnotatedCue, token: Token): void;
  /** A cue was watched for ≥1.5s without a lookup (implicit "probably known" signal). */
  onExposure?(cue: AnnotatedCue): void;
}

interface Popover {
  cueId: string;
  token: number;
  x: number;
  bottom: number;
  /** We paused the video when opening; resume on close. */
  resume: boolean;
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

export function Overlay({
  state,
  video,
  settings,
  onMove,
  annotations,
  ai,
  wordInfo,
  onWord,
  onExposure,
}: OverlayProps) {
  const index = useActiveCue(video, state.cues);
  const rootRef = useRef<HTMLDivElement>(null);
  // The gesture lives in a ref: pointerup can arrive before a re-render on a quick click.
  const gesture = useRef<{
    startX: number;
    startY: number;
    startPos: number;
    pos: number;
    moved: boolean;
    word: number | undefined;
  } | null>(null);
  /** Caption position while dragging (null = not dragging); state only to re-render. */
  const [dragPos, setDragPos] = useState<number | null>(null);
  const [pop, setPop] = useState<Popover | null>(null);
  const shown = useRef<{ id: string; enter: number; lookedUp: boolean } | null>(null);

  // Exposure: when the active cue changes, credit the previous one if it was watched long enough.
  const cueId = index >= 0 ? state.cues[index]?.id : undefined;
  useEffect(() => {
    const now = video?.currentTime ?? 0;
    const prev = shown.current;
    if (prev && prev.id !== cueId && !prev.lookedUp && now - prev.enter >= EXPOSURE_MIN_S) {
      const a = annotations?.get(prev.id);
      if (a) onExposure?.(a);
    }
    shown.current = cueId ? { id: cueId, enter: now, lookedUp: false } : null;
  }, [cueId]); // only the cue change matters here

  const popRef = useRef<Popover | null>(null);
  popRef.current = pop;
  const closePop = useCallback(() => {
    if (popRef.current?.resume) void video?.play();
    setPop(null);
  }, [video]);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [aiDismissed, setAiDismissed] = useState<string | null>(null);

  if (state.ad) return null;

  const openCue = pop ? annotations?.get(pop.cueId) : undefined;
  // While a word popover is open the video is paused; keep showing that cue.
  const cue = openCue ?? (index >= 0 ? state.cues[index] : undefined);
  const ann = cue ? annotations?.get(cue.id) : undefined;
  const info = (lemma: string) => wordInfo?.(lemma);
  const glossed = new Set(
    ann && wordInfo
      ? selectGlosses(
          ann.tokens,
          (l) => info(l) ?? { pKnown: 1, state: 'new', custom: false, rank: 1 },
          settings.glossDensity,
        )
      : [],
  );
  const position = dragPos ?? settings.captionPosition;
  const langName = LANGUAGES[settings.targetLang];
  const showNotice = state.status === 'no-target' || state.status === 'no-captions';
  const l1 = cue ? annotations?.get(cue.id)?.l1 : undefined;
  const aiText = aiMessage(ai);
  // Progress clears itself; problems can be dismissed per video.
  const showAi =
    !!aiText && (!ai?.error && ai?.provider !== 'null' ? true : aiDismissed !== state.videoId);

  const openWord = (i: number, el: Element) => {
    const root = rootRef.current;
    if (!ann || !root) return;
    const token = ann.tokens[i];
    if (!token) return;
    const r = el.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    const resume = !!video && !video.paused;
    if (resume) video?.pause();
    if (shown.current) shown.current.lookedUp = true;
    setPop({
      cueId: ann.id,
      token: i,
      x: r.left + r.width / 2 - rr.left,
      bottom: rr.bottom - r.top + 8,
      resume,
    });
    onWord?.('lookup', ann, token);
  };

  const onPointerDown = (e: PointerEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const wordEl = (e.target as Element | null)?.closest?.('[data-i]');
    gesture.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPos: settings.captionPosition,
      pos: settings.captionPosition,
      moved: false,
      word: wordEl ? Number(wordEl.getAttribute('data-i')) : undefined,
    };
  };
  const onPointerMove = (e: PointerEvent) => {
    const g = gesture.current;
    const height = rootRef.current?.clientHeight;
    if (!g || !height) return;
    g.moved ||= Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > DRAG_SLOP;
    if (!g.moved) return;
    g.pos = clampPos(g.startPos + ((g.startY - e.clientY) / height) * 100);
    setDragPos(g.pos);
  };
  const onPointerUp = (e: PointerEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    e.stopPropagation();
    if (g.moved) {
      if (g.pos !== g.startPos) onMove(Math.round(g.pos * 10) / 10);
      setDragPos(null);
    } else if (g.word !== undefined) {
      const el = rootRef.current?.querySelector(`[data-i="${g.word}"]`);
      if (el && popRef.current?.token !== g.word) openWord(g.word, el);
      else closePop();
    }
  };

  return (
    <div
      ref={rootRef}
      class={`root${settings.captionHighContrast ? ' hc' : ''}${pop ? ' popping' : ''}`}
    >
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
          class={`box${dragPos !== null ? ' dragging' : ''}`}
          lang={state.lang ?? settings.targetLang}
          style={{ bottom: `${position}%`, fontSize: `${settings.captionFontSize}px` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onMouseDown={stop}
          onClick={stop}
          onDblClick={stop}
        >
          {ann ? <Caption cue={ann} glossed={glossed} info={info} active={pop?.token} /> : cue.text}
          {l1 && (
            <div class="l1" lang={settings.nativeLang}>
              {l1}
            </div>
          )}
        </div>
      )}
      {pop && openCue?.tokens[pop.token] && (
        <WordPopover
          token={openCue.tokens[pop.token] as Token}
          info={info((openCue.tokens[pop.token] as Token).lemma)}
          lang={state.lang ?? settings.targetLang}
          x={pop.x}
          bottom={pop.bottom}
          onClose={closePop}
          onAction={(a) => {
            onWord?.(a, openCue, openCue.tokens[pop.token] as Token);
            if (a !== 'save') closePop();
          }}
        />
      )}
    </div>
  );
}
