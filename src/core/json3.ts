import type { Cue } from './types';

/** Merge limits for auto-caption fragments (SPEC M1). */
export const MAX_GAP_S = 0.8;
export const MAX_WORDS = 12;

interface Json3Seg {
  utf8?: unknown;
  tOffsetMs?: unknown;
}
interface Json3Event {
  tStartMs?: unknown;
  dDurationMs?: unknown;
  segs?: unknown;
}

interface Word {
  text: string;
  start: number; // ms
  end: number; // ms
}

const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

const SENTENCE_END = /[.!?…。！？]["'»”)\]]*$/;

function cleanText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function eventsOf(data: unknown): Json3Event[] {
  const events = (data as { events?: unknown } | null)?.events;
  return Array.isArray(events)
    ? (events.filter((e) => e && typeof e === 'object') as Json3Event[])
    : [];
}

function segsOf(e: Json3Event): Json3Seg[] {
  return Array.isArray(e.segs)
    ? (e.segs.filter((s) => s && typeof s === 'object') as Json3Seg[])
    : [];
}

/**
 * Parse a YouTube `fmt=json3` timedtext payload into cues (seconds).
 *
 * Manual tracks keep their authored events as cues. Auto-generated (ASR)
 * tracks arrive as word fragments with per-word offsets; those are merged
 * into sentence-ish cues, split on sentence punctuation, gaps > 0.8s, or
 * 12 words.
 */
export function parseJson3(data: unknown, opts: { asr?: boolean } = {}): Cue[] {
  const events = eventsOf(data);
  const asr =
    opts.asr ?? events.some((e) => segsOf(e).some((s) => typeof s.tOffsetMs === 'number'));
  return asr ? mergeWords(wordsOf(events)) : manualCues(events);
}

function manualCues(events: Json3Event[]): Cue[] {
  const cues: Cue[] = [];
  for (const e of events) {
    const text = cleanText(
      segsOf(e)
        .map((s) => (typeof s.utf8 === 'string' ? s.utf8 : ''))
        .join(''),
    );
    if (!text) continue;
    const start = num(e.tStartMs);
    const end = start + Math.max(0, num(e.dDurationMs));
    cues.push({ id: `c${cues.length}`, start: start / 1000, end: end / 1000, text });
  }
  return cues;
}

function wordsOf(events: Json3Event[]): Word[] {
  const raw: { text: string; start: number; eventEnd: number }[] = [];
  for (const e of events) {
    const t0 = num(e.tStartMs);
    const eventEnd = t0 + Math.max(0, num(e.dDurationMs));
    for (const s of segsOf(e)) {
      if (typeof s.utf8 !== 'string') continue;
      const text = cleanText(s.utf8);
      if (!text) continue; // "\n" append events
      raw.push({ text, start: t0 + num(s.tOffsetMs), eventEnd });
    }
  }
  raw.sort((a, b) => a.start - b.start);
  return raw.map((w, i) => {
    const next = raw[i + 1];
    const end = Math.min(w.eventEnd, next ? next.start : w.eventEnd);
    return { text: w.text, start: w.start, end: Math.max(end, w.start) };
  });
}

function mergeWords(words: Word[]): Cue[] {
  const cues: Cue[] = [];
  let cur: Word[] = [];
  let wordCount = 0;

  const flush = () => {
    const first = cur[0];
    const last = cur[cur.length - 1];
    if (first && last) {
      cues.push({
        id: `c${cues.length}`,
        start: first.start / 1000,
        end: last.end / 1000,
        text: cur.map((w) => w.text).join(' '),
      });
    }
    cur = [];
    wordCount = 0;
  };

  for (const w of words) {
    const prev = cur[cur.length - 1];
    const n = w.text.split(' ').length;
    if (prev && (w.start - prev.end > MAX_GAP_S * 1000 || wordCount + n > MAX_WORDS)) flush();
    cur.push(w);
    wordCount += n;
    if (SENTENCE_END.test(w.text)) flush();
  }
  flush();
  return cues;
}
