/**
 * Runs in YouTube's MAIN world at document_start. Observes the player's
 * own /api/timedtext responses (we never fetch timedtext ourselves — it
 * needs tokens that change) and turns on the best caption track so the
 * player loads it. Everything is forwarded to the ISOLATED script.
 */
import { listen, parseIsoMessage, postToIso, timedtextInfo } from './bridge';
import { pickTrack, type TrackInfo } from '../core/lang';

interface YTPlayer extends HTMLElement {
  getPlayerResponse?: () => unknown;
  getVideoData?: () => { video_id?: string } | undefined;
  loadModule?: (m: string) => void;
  unloadModule?: (m: string) => void;
  getOption?: (m: string, k: string) => unknown;
  setOption?: (m: string, k: string, v: unknown) => void;
}

interface YTTrackOption {
  languageCode?: string;
  kind?: string;
  /** Set when YouTube auto-translates the track into another language. */
  translationLanguage?: { languageCode?: string } | null;
}

const MAX_CACHED = 6;
const SET_TRACK_ATTEMPTS = 10;

const recent: { videoId: string; url: string; body: string }[] = [];
let config = { targetLang: '', enabled: false };
let lastTracks: { videoId: string; tracks: TrackInfo[] } | null = null;
let forcedFor: string | null = null;
/** We turned captions on ourselves, so we may turn them off again. */
let weTurnedOn = false;

const isTimedtext = (url: string) => url.includes('/api/timedtext');

function capture(url: string, body: string) {
  const info = timedtextInfo(url);
  if (!info || !body) return;
  recent.push({ videoId: info.videoId, url, body });
  if (recent.length > MAX_CACHED) recent.shift();
  postToIso({ type: 'timedtext', url, body });
}

function patchFetch() {
  const orig = window.fetch;
  window.fetch = function (this: unknown, ...args: Parameters<typeof fetch>) {
    const res = orig.apply(this, args);
    try {
      const req = args[0];
      const url = typeof req === 'string' ? req : req instanceof URL ? req.href : req.url;
      if (isTimedtext(url)) {
        res
          .then((r) => r.clone().text())
          .then((body) => capture(url, body))
          .catch(() => {});
      }
    } catch {
      // never break the page's fetch
    }
    return res;
  };
}

function xhrBody(xhr: XMLHttpRequest): string {
  switch (xhr.responseType) {
    case '':
    case 'text':
      return xhr.responseText;
    case 'json':
      return JSON.stringify(xhr.response);
    case 'arraybuffer':
      return new TextDecoder().decode(xhr.response as ArrayBuffer);
    default:
      return '';
  }
}

function patchXhr() {
  const urls = new WeakMap<XMLHttpRequest, string>();
  const proto = XMLHttpRequest.prototype;
  const open = proto.open as (this: XMLHttpRequest, ...a: unknown[]) => void;
  const send = proto.send;
  proto.open = function (this: XMLHttpRequest, ...args: unknown[]) {
    const url = args[1];
    urls.set(this, url instanceof URL ? url.href : String(url));
    return open.apply(this, args);
  } as typeof proto.open;
  proto.send = function (this: XMLHttpRequest, ...args: Parameters<typeof send>) {
    const url = urls.get(this);
    if (url && isTimedtext(url)) {
      this.addEventListener('load', () => {
        try {
          capture(url, xhrBody(this));
        } catch {
          // ignore unreadable responses
        }
      });
    }
    return send.apply(this, args);
  };
}

function player(): YTPlayer | null {
  if (location.pathname !== '/watch') return null;
  return document.getElementById('movie_player') as YTPlayer | null;
}

function textOf(name: unknown): string | undefined {
  const n = name as { simpleText?: string; runs?: { text?: string }[] } | undefined;
  return n?.simpleText ?? n?.runs?.map((r) => r.text ?? '').join('');
}

function readTracks(p: YTPlayer): { videoId: string; tracks: TrackInfo[] } | null {
  const resp = p.getPlayerResponse?.() as
    | {
        videoDetails?: { videoId?: string };
        captions?: {
          playerCaptionsTracklistRenderer?: {
            captionTracks?: { languageCode?: string; kind?: string; name?: unknown }[];
          };
        };
      }
    | undefined;
  const videoId = p.getVideoData?.()?.video_id || resp?.videoDetails?.videoId;
  if (!videoId || !resp) return null;
  const list = resp.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  const tracks = list
    .filter((t) => typeof t.languageCode === 'string')
    .map((t) => ({
      lang: t.languageCode as string,
      kind: t.kind === 'asr' ? ('asr' as const) : ('manual' as const),
      name: textOf(t.name),
    }));
  return { videoId, tracks };
}

const sameTrack = (o: YTTrackOption | undefined, t: TrackInfo) =>
  o?.languageCode === t.lang && (o.kind === 'asr') === (t.kind === 'asr');

/** Showing exactly this track, not an auto-translation of it. */
const showing = (o: YTTrackOption | undefined, t: TrackInfo) =>
  sameTrack(o, t) && !o?.translationLanguage?.languageCode;

function setTrack(p: YTPlayer, videoId: string, pick: TrackInfo, attempt = 0) {
  if (!config.enabled || p.getVideoData?.()?.video_id !== videoId) return;
  try {
    const current = p.getOption?.('captions', 'track') as YTTrackOption | undefined;
    if (showing(current, pick)) return;
    if (attempt === 0 && !current?.languageCode) weTurnedOn = true;
    p.loadModule?.('captions');
    const list = p.getOption?.('captions', 'tracklist');
    const entry = Array.isArray(list)
      ? (list as YTTrackOption[]).find((o) => sameTrack(o, pick))
      : undefined;
    const option: YTTrackOption = { ...(entry ?? { languageCode: pick.lang }) };
    // If the user's auto-translate keeps sticking, clear it explicitly.
    if (attempt >= 2 && current?.translationLanguage) option.translationLanguage = null;
    p.setOption?.('captions', 'track', option);
  } catch {
    // player API changed; the DOM fallback in the isolated script still works
  }
  if (attempt < SET_TRACK_ATTEMPTS) setTimeout(() => setTrack(p, videoId, pick, attempt + 1), 500);
}

function check() {
  const p = player();
  if (!p) return;
  const t = readTracks(p);
  if (!t) return;
  if (t.videoId !== lastTracks?.videoId || t.tracks.length !== lastTracks.tracks.length) {
    lastTracks = t;
    postToIso({ type: 'tracks', ...t });
  }
  if (config.enabled && config.targetLang && forcedFor !== t.videoId) {
    const pick = pickTrack(t.tracks, config.targetLang);
    if (pick) {
      forcedFor = t.videoId;
      setTrack(p, t.videoId, pick);
    }
  }
}

function onConfig(next: typeof config) {
  const langChanged = next.targetLang !== config.targetLang;
  const wasEnabled = config.enabled;
  config = next;
  if (langChanged) forcedFor = null;
  if (wasEnabled && !next.enabled && weTurnedOn) {
    weTurnedOn = false;
    forcedFor = null;
    try {
      player()?.unloadModule?.('captions');
    } catch {
      // ignore
    }
  }
  // The isolated script may have started after we captured: replay.
  const videoId = lastTracks?.videoId;
  if (lastTracks) postToIso({ type: 'tracks', ...lastTracks });
  for (const r of recent)
    if (r.videoId === videoId) postToIso({ type: 'timedtext', url: r.url, body: r.body });
  check();
}

export function startMainBridge() {
  patchFetch();
  patchXhr();
  listen(parseIsoMessage, (m) => onConfig({ targetLang: m.targetLang, enabled: m.enabled }));
  document.addEventListener('yt-navigate-finish', () => {
    forcedFor = null;
    check();
  });
  setInterval(check, 1000);
}
