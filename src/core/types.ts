import type { Card as FsrsCard } from 'ts-fsrs';

/** A caption cue. Times are in seconds. */
export interface Cue {
  id: string;
  start: number;
  end: number;
  text: string;
}

/** A word in a cue. `start`/`end` are char offsets into `cue.text`. */
export interface Token {
  surface: string;
  lemma: string;
  pos: string;
  gloss: string;
  start: number;
  end: number;
}

export interface AnnotatedCue extends Cue {
  tokens: Token[];
  l1?: string;
}

export type WordState = 'new' | 'seen' | 'learning' | 'known' | 'ignored';

export interface LexEntry {
  lemma: string;
  lang: string;
  state: WordState;
  pKnown: number;
  exposures: number;
  lookups: number;
  firstSeen: number;
  lastSeen: number;
  custom: boolean;
}

export interface Card {
  id: string;
  lemma: string;
  lang: string;
  sentence: string;
  gloss: string;
  videoId: string;
  t: number;
  fsrs: FsrsCard;
}
