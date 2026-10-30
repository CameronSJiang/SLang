import { nullAnnotate } from '../core/annotation';
import type { LLMProvider } from './types';

/** Dictionary-free fallback: tokens only, no glosses or translations. */
export const nullProvider: LLMProvider = {
  id: 'null',
  chunkSize: 1000,
  available: async () => true,
  annotate: async (cues, ctx) => nullAnnotate(cues, ctx.lang),
  translateLine: async () => '',
  translateCues: async () => {
    throw new Error('No translation provider available');
  },
};
