import type { CachedTranscript, TranscriptCache } from '../llm/annotator';
import { db } from './db';

export const dexieTranscriptCache: TranscriptCache = {
  get: (key) => db.transcripts.get(key),
  put: async (row: CachedTranscript) => {
    await db.transcripts.put(row);
  },
};
