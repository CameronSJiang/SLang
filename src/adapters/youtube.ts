/**
 * YouTube caption adapter (ISOLATED world). Primary source: json3 payloads
 * forwarded by the MAIN-world bridge. Fallback: on-screen caption text
 * (`.ytp-caption-segment`), built into cues live.
 */
import { listen, parseMainMessage, postToMain, timedtextInfo, type MainMessage } from './bridge';
import { IDLE_STATE, type CaptionState } from './types';
import { parseJson3 } from '../core/json3';
import { hasLang, langMatches, type TrackInfo } from '../core/lang';
import { LiveCueBuilder } from '../core/liveCues';
import type { Cue } from '../core/types';

/** Wait this long after playback starts before trusting on-screen text instead. */
const FALLBACK_AFTER_S = 4;

export function youtubeVideoId(loc: Location = location): string | null {
  return loc.pathname === '/watch' ? new URLSearchParams(loc.search).get('v') : null;
}

export function youtubePlayer(): HTMLElement | null {
  return document.getElementById('movie_player');
}

export interface YouTubeAdapter {
  setTarget(lang: string, enabled: boolean): void;
  stop(): void;
}

export function startYouTubeAdapter(
  initial: { targetLang: string; enabled: boolean },
  onChange: (s: CaptionState) => void,
): YouTubeAdapter {
  let { targetLang, enabled } = initial;
  let state: CaptionState = IDLE_STATE;
  let tracks: TrackInfo[] | null = null;
  /** Captured json3 tracks for the current video, in arrival order. */
  let captured = new Map<string, { lang: string; cues: Cue[] }>();
  const live = new LiveCueBuilder();
  let observedPlayer: HTMLElement | null = null;
  let observers: MutationObserver[] = [];

  const emit = (patch: Partial<CaptionState>) => {
    state = { ...state, ...patch };
    onChange(state);
  };

  const sendConfig = () => postToMain({ type: 'config', targetLang, enabled });

  function recompute() {
    const targetEntries = [...captured.values()].filter((c) => langMatches(c.lang, targetLang));
    const sources = new Map(
      [...captured]
        .filter(([, c]) => !langMatches(c.lang, targetLang))
        .map(([k, c]) => [k, c.cues]),
    );
    // Most recent target-language capture wins, so a manual track switch is respected.
    const best = targetEntries[targetEntries.length - 1];
    if (best) {
      emit({ cues: best.cues, lang: best.lang, live: false, status: 'ready', sources });
    } else if (live.cues.length) {
      emit({ cues: [...live.cues], live: true, status: 'ready', sources });
    } else {
      const noTarget = tracks !== null && !hasLang(tracks, targetLang);
      emit({
        cues: [],
        lang: null,
        live: false,
        status: noTarget ? 'no-target' : 'waiting',
        sources,
      });
    }
  }

  function resetFor(videoId: string | null) {
    captured = new Map();
    tracks = null;
    live.reset();
    state = { ...IDLE_STATE, videoId, status: videoId ? 'waiting' : 'idle', ad: state.ad };
    onChange(state);
    if (videoId) sendConfig(); // asks the MAIN bridge to replay anything it already captured
  }

  function onMessage(m: MainMessage) {
    if (!state.videoId) return;
    if (m.type === 'tracks') {
      if (m.videoId !== state.videoId) return;
      tracks = m.tracks;
      recompute();
      return;
    }
    const info = timedtextInfo(m.url);
    if (!info || info.videoId !== state.videoId) return;
    let data: unknown;
    try {
      data = JSON.parse(m.body);
    } catch {
      return; // not json3 (e.g. srv3 XML): the DOM fallback covers it
    }
    const cues = parseJson3(data, { asr: info.kind === 'asr' });
    if (!cues.length) return;
    const key = `${info.lang}:${info.kind}`;
    captured.delete(key);
    captured.set(key, { lang: info.lang, cues });
    recompute();
  }

  function onCaptionDom() {
    if (!enabled || state.ad || !observedPlayer) return;
    if ([...captured.values()].some((c) => langMatches(c.lang, targetLang))) return;
    // Only trust on-screen text when the shown track is (probably) the target language.
    if (tracks && !hasLang(tracks, targetLang)) return;
    const video = observedPlayer.querySelector('video');
    if (!video || video.currentTime < FALLBACK_AFTER_S) return;
    const text = [...observedPlayer.querySelectorAll('.ytp-caption-segment')]
      .map((el) => el.textContent ?? '')
      .join(' ');
    if (live.push(text, video.currentTime)) recompute();
  }

  function attach(p: HTMLElement | null) {
    if (p === observedPlayer) return;
    observers.forEach((o) => o.disconnect());
    observers = [];
    observedPlayer = p;
    if (!p) return;
    const ad = () => p.classList.contains('ad-showing');
    emit({ ad: ad() });
    const adObserver = new MutationObserver(() => {
      if (ad() !== state.ad) emit({ ad: ad() });
    });
    adObserver.observe(p, { attributes: true, attributeFilter: ['class'] });
    const captionObserver = new MutationObserver((records) => {
      const touched = records.some((r) => {
        const el = r.target instanceof Element ? r.target : r.target.parentElement;
        return !!el?.closest('.ytp-caption-window-container');
      });
      if (touched) onCaptionDom();
    });
    captionObserver.observe(p, { childList: true, subtree: true, characterData: true });
    observers = [adObserver, captionObserver];
  }

  function tick() {
    const id = youtubeVideoId();
    if (id !== state.videoId) resetFor(id);
    attach(id ? youtubePlayer() : null);
  }

  const unlisten = listen(parseMainMessage, onMessage);
  const onNav = () => tick();
  document.addEventListener('yt-navigate-finish', onNav);
  const interval = setInterval(tick, 1000);
  tick();
  sendConfig();

  return {
    setTarget(lang, on) {
      const changed = lang !== targetLang;
      targetLang = lang;
      enabled = on;
      sendConfig();
      if (changed) {
        live.reset();
        recompute();
      }
    },
    stop() {
      unlisten();
      document.removeEventListener('yt-navigate-finish', onNav);
      clearInterval(interval);
      observers.forEach((o) => o.disconnect());
    },
  };
}
