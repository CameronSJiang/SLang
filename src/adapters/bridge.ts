/**
 * Messages between the MAIN-world script (page context, can see the
 * player's network traffic) and the ISOLATED content script (extension
 * context). They share `window`, so every message is validated: any page
 * script could post look-alikes.
 */
import type { TrackInfo } from '../core/lang';

const NS = 'slang';
const MAX_BODY = 8 * 1024 * 1024;

export type MainMessage =
  | { ns: typeof NS; dir: 'main'; type: 'timedtext'; url: string; body: string }
  | { ns: typeof NS; dir: 'main'; type: 'tracks'; videoId: string; tracks: TrackInfo[] };

export type IsoMessage = {
  ns: typeof NS;
  dir: 'iso';
  type: 'config';
  targetLang: string;
  enabled: boolean;
};

type Without<T> = T extends unknown ? Omit<T, 'ns' | 'dir'> : never;

const isStr = (v: unknown): v is string => typeof v === 'string';

function isTrack(v: unknown): v is TrackInfo {
  const t = v as TrackInfo | null;
  return !!t && isStr(t.lang) && (t.kind === 'manual' || t.kind === 'asr');
}

export function parseMainMessage(data: unknown): MainMessage | null {
  const m = data as Record<string, unknown> | null;
  if (!m || m.ns !== NS || m.dir !== 'main') return null;
  if (m.type === 'timedtext' && isStr(m.url) && isStr(m.body) && m.body.length <= MAX_BODY) {
    return timedtextInfo(m.url) ? (m as MainMessage) : null;
  }
  if (
    m.type === 'tracks' &&
    isStr(m.videoId) &&
    Array.isArray(m.tracks) &&
    m.tracks.every(isTrack)
  ) {
    return m as MainMessage;
  }
  return null;
}

export function parseIsoMessage(data: unknown): IsoMessage | null {
  const m = data as Record<string, unknown> | null;
  if (!m || m.ns !== NS || m.dir !== 'iso') return null;
  if (m.type === 'config' && isStr(m.targetLang) && typeof m.enabled === 'boolean') {
    return m as IsoMessage;
  }
  return null;
}

export interface TimedtextInfo {
  videoId: string;
  /** Track language; for YouTube auto-translated tracks this is the translation target. */
  lang: string;
  kind: 'manual' | 'asr';
  fmt: string;
}

/** Parse a `/api/timedtext` URL, or null if it isn't one. */
export function timedtextInfo(url: string): TimedtextInfo | null {
  let u: URL;
  try {
    u = new URL(url, 'https://www.youtube.com');
  } catch {
    return null;
  }
  if (!u.pathname.endsWith('/api/timedtext')) return null;
  const videoId = u.searchParams.get('v');
  const lang = u.searchParams.get('tlang') || u.searchParams.get('lang');
  if (!videoId || !lang) return null;
  return {
    videoId,
    lang,
    kind: u.searchParams.get('kind') === 'asr' ? 'asr' : 'manual',
    fmt: u.searchParams.get('fmt') ?? '',
  };
}

export function postToIso(msg: Without<MainMessage>): void {
  window.postMessage({ ...msg, ns: NS, dir: 'main' }, location.origin);
}

export function postToMain(msg: Without<IsoMessage>): void {
  window.postMessage({ ...msg, ns: NS, dir: 'iso' }, location.origin);
}

export function listen<T>(parse: (d: unknown) => T | null, handler: (m: T) => void): () => void {
  const fn = (e: MessageEvent) => {
    if (e.source !== window || e.origin !== location.origin) return;
    const m = parse(e.data);
    if (m) handler(m);
  };
  window.addEventListener('message', fn);
  return () => window.removeEventListener('message', fn);
}
