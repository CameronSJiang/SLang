/** Caption-track helpers shared by adapters. */

export interface TrackInfo {
  lang: string;
  kind: 'manual' | 'asr';
  name?: string;
}

/** True if a BCP-47 track code (e.g. `es-419`) belongs to `target` (e.g. `es`). */
export function langMatches(trackLang: string, target: string): boolean {
  const a = trackLang.toLowerCase();
  const b = target.toLowerCase();
  return a === b || a.startsWith(`${b}-`);
}

/**
 * The track to turn on: the target language if it exists (manual over
 * auto-generated), else any track so its text is still captured for dubbing.
 */
export function pickTrack(tracks: readonly TrackInfo[], target: string): TrackInfo | undefined {
  const rank = (t: TrackInfo) => (langMatches(t.lang, target) ? 0 : 2) + (t.kind === 'asr' ? 1 : 0);
  return [...tracks].sort((a, b) => rank(a) - rank(b))[0];
}

export function hasLang(tracks: readonly TrackInfo[], target: string): boolean {
  return tracks.some((t) => langMatches(t.lang, target));
}
