import type { Cue } from './types';

/**
 * Builds cues from caption text as it appears on screen (no lookahead).
 * Used when the full transcript can't be captured. The newest cue stays
 * open (end = Infinity) until the text changes or clears.
 */
export class LiveCueBuilder {
  readonly cues: Cue[] = [];
  private open: Cue | null = null;

  /** Feed the currently visible caption text at video time `t` (seconds). */
  push(text: string, t: number): boolean {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (this.open && clean === this.open.text) return false;
    if (this.open) {
      this.open.end = Math.max(t, this.open.start);
      this.open = null;
    }
    if (!clean) return true;
    // A seek backwards invalidates anything after the new position.
    while (this.cues.length && (this.cues[this.cues.length - 1] as Cue).start > t) this.cues.pop();
    this.open = { id: `live${t.toFixed(2)}`, start: t, end: Infinity, text: clean };
    this.cues.push(this.open);
    return true;
  }

  reset(): void {
    this.cues.length = 0;
    this.open = null;
  }
}

/** Strip WebVTT markup (`<c.yellow>`, `<00:01.000>`, `<v Bob>`) and decode basic entities. */
export function cleanVttText(s: string): string {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
