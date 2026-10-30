import type { Cue } from './types';

/**
 * Index of the cue on screen at time `t` (seconds), or -1. `cues` must be
 * sorted by start. If cues overlap, the latest-starting one wins.
 */
export function findCueIndex(cues: readonly Cue[], t: number): number {
  let lo = 0;
  let hi = cues.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if ((cues[mid] as Cue).start <= t) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found >= 0 && t < (cues[found] as Cue).end ? found : -1;
}
