/**
 * Generic HTML5 adapter: reads a page video's own text tracks. Injected on
 * demand from the popup (activeTab + scripting), never automatically.
 */
import { IDLE_STATE, type CaptionState } from './types';
import { langMatches } from '../core/lang';
import { cleanVttText } from '../core/liveCues';
import type { Cue } from '../core/types';

/** The largest visible video on the page. */
export function findMainVideo(doc: Document = document): HTMLVideoElement | null {
  let best: HTMLVideoElement | null = null;
  let bestArea = 0;
  for (const v of doc.querySelectorAll('video')) {
    const r = v.getBoundingClientRect();
    const area = r.width * r.height;
    if (area > bestArea) {
      best = v;
      bestArea = area;
    }
  }
  return best;
}

const isTextTrack = (t: TextTrack) => t.kind === 'subtitles' || t.kind === 'captions';

function readCues(track: TextTrack): Cue[] {
  return [...(track.cues ?? [])]
    .map((c, i) => ({
      id: c.id || `h${i}`,
      start: c.startTime,
      end: c.endTime,
      text: cleanVttText((c as VTTCue).text ?? ''),
    }))
    .filter((c) => c.text)
    .sort((a, b) => a.start - b.start);
}

export function startHtml5Adapter(
  video: HTMLVideoElement,
  initialTarget: string,
  onChange: (s: CaptionState) => void,
): { setTarget(lang: string): void; stop(): void } {
  let target = initialTarget;
  let track: TextTrack | null = null;
  let state: CaptionState = { ...IDLE_STATE, videoId: location.href, status: 'waiting' };

  const emit = (patch: Partial<CaptionState>) => {
    state = { ...state, ...patch };
    onChange(state);
  };

  const refresh = () => {
    if (!track) return;
    const cues = readCues(track);
    if (cues.length !== state.cues.length || cues[0]?.start !== state.cues[0]?.start) {
      emit({ cues });
    }
  };

  const choose = () => {
    const tracks = [...video.textTracks].filter(isTextTrack);
    // Target language first, then tracks with no declared language.
    const pick =
      tracks.find((t) => langMatches(t.language, target)) ?? tracks.find((t) => !t.language);
    for (const t of tracks) if (t !== pick && t.mode === 'showing') t.mode = 'disabled';
    if (pick !== track) {
      track?.removeEventListener('cuechange', refresh);
      track = pick ?? null;
      track?.addEventListener('cuechange', refresh);
    }
    if (!track) {
      emit({ cues: [], lang: null, status: tracks.length ? 'no-target' : 'no-captions' });
      return;
    }
    track.mode = 'hidden'; // loads cues without native rendering
    emit({ cues: readCues(track), lang: track.language || null, status: 'ready' });
  };

  const onTrackLoad = () => refresh();
  video.textTracks.addEventListener('addtrack', choose);
  video.querySelectorAll('track').forEach((el) => el.addEventListener('load', onTrackLoad));
  // Streaming players append cues over time without always firing events.
  const interval = setInterval(refresh, 2000);
  choose();

  return {
    setTarget(lang) {
      target = lang;
      choose();
    },
    stop() {
      clearInterval(interval);
      video.textTracks.removeEventListener('addtrack', choose);
      video.querySelectorAll('track').forEach((el) => el.removeEventListener('load', onTrackLoad));
      track?.removeEventListener('cuechange', refresh);
    },
  };
}
