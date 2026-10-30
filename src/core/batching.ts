/** Chunk planning for transcript annotation. */
import type { Cue } from './types';

export interface Chunk {
  /** Cues [start, end) are annotated; [contextStart, start) are sent as context only. */
  start: number;
  end: number;
  contextStart: number;
}

export function planChunks(n: number, size: number, overlap: number): Chunk[] {
  const step = Math.max(1, Math.floor(size));
  const chunks: Chunk[] = [];
  for (let start = 0; start < n; start += step) {
    chunks.push({
      start,
      end: Math.min(n, start + step),
      contextStart: Math.max(0, start - overlap),
    });
  }
  return chunks;
}

/**
 * Pick the next chunk to annotate: the one under the playhead, then the
 * ones after it in order, then earlier ones (nearest first).
 */
export function nextChunk(
  pending: ReadonlySet<number>,
  chunks: readonly Chunk[],
  cues: readonly Cue[],
  playhead: number,
): number | undefined {
  if (!pending.size) return undefined;
  // First chunk whose last cue ends after the playhead.
  let here = chunks.findIndex((c) => (cues[c.end - 1] as Cue).end > playhead);
  if (here < 0) here = chunks.length - 1;
  for (let i = here; i < chunks.length; i++) if (pending.has(i)) return i;
  for (let i = here - 1; i >= 0; i--) if (pending.has(i)) return i;
  return undefined;
}
