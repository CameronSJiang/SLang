import Dexie, { type EntityTable, type Table } from 'dexie';
import type { AnnotatedCue, Card, LexEntry } from '../core/types';

export const TRANSCRIPT_SCHEMA_VERSION = 1;

export interface TranscriptRow {
  /** `${site}:${videoId}:${lang}:${schemaVersion}` */
  key: string;
  cues: AnnotatedCue[];
  createdAt: number;
}

export interface ReviewLogRow {
  id?: number;
  cardId: string;
  rating: number;
  reviewedAt: number;
}

export interface SessionRow {
  id?: number;
  kind: 'watch' | 'review';
  videoId?: string;
  startedAt: number;
  endedAt?: number;
  seconds: number;
}

export interface SettingRow {
  key: string;
  value: unknown;
}

export function transcriptKey(site: string, videoId: string, lang: string): string {
  return `${site}:${videoId}:${lang}:${TRANSCRIPT_SCHEMA_VERSION}`;
}

export const db = new Dexie('weave') as Dexie & {
  transcripts: EntityTable<TranscriptRow, 'key'>;
  lexicon: Table<LexEntry, [string, string]>;
  cards: EntityTable<Card, 'id'>;
  reviewLog: EntityTable<ReviewLogRow, 'id'>;
  sessions: EntityTable<SessionRow, 'id'>;
  settings: EntityTable<SettingRow, 'key'>;
};

db.version(1).stores({
  transcripts: 'key',
  lexicon: '[lang+lemma], lang, state, lastSeen',
  cards: 'id, [lang+lemma], videoId',
  reviewLog: '++id, cardId, reviewedAt',
  sessions: '++id, kind, startedAt',
  settings: 'key',
});
