/**
 * Frequency lists (public/freq/<lang>.json.gz, most common first). Loadable
 * from any extension context (background, offscreen, options) — not from
 * content scripts, which ask the background instead.
 */
import { browser } from 'wxt/browser';

export interface FreqList {
  words: readonly string[];
  rank(word: string): number | undefined;
}

const lists = new Map<string, Promise<FreqList | null>>();

async function fetchList(lang: string): Promise<FreqList | null> {
  // `/freq/*` isn't in WXT's typed public paths until the build runs, hence the cast.
  const url = browser.runtime.getURL(`/freq/${lang}.json.gz` as '/');
  const res = await fetch(url);
  if (!res.ok || !res.body) return null;
  const text = await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).text();
  const words = JSON.parse(text) as string[];
  const ranks = new Map(words.map((w, i) => [w, i + 1]));
  return { words, rank: (w) => ranks.get(w) };
}

/** The frequency list for `lang` (base code), or null if we don't ship one. */
export function loadFreq(lang: string): Promise<FreqList | null> {
  const base = lang.split('-')[0] ?? lang;
  let p = lists.get(base);
  if (!p) {
    p = fetchList(base).catch(() => null);
    lists.set(base, p);
  }
  return p;
}
