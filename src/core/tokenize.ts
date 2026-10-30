/** Word segmentation for caption text. Pure: Intl only. */

export interface WordSpan {
  surface: string;
  /** Char offsets into the source text. */
  start: number;
  end: number;
}

const segmenters = new Map<string, Intl.Segmenter>();

function segmenter(lang: string): Intl.Segmenter {
  let s = segmenters.get(lang);
  if (!s) {
    s = new Intl.Segmenter(lang, { granularity: 'word' });
    segmenters.set(lang, s);
  }
  return s;
}

/** Word-like segments of `text` (punctuation and spaces dropped). */
export function tokenize(text: string, lang: string): WordSpan[] {
  const out: WordSpan[] = [];
  for (const seg of segmenter(lang).segment(text)) {
    if (!seg.isWordLike) continue;
    out.push({ surface: seg.segment, start: seg.index, end: seg.index + seg.segment.length });
  }
  return out;
}
