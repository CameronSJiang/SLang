/** Content script → background requests for the learner lexicon. */
import type { WordInfo } from '../core/glossPolicy';
import type { LexEvent } from '../core/learner';
import type { SaveCardInput } from './lexicon';

export type LexRequest = { target: 'background' } & (
  | { op: 'lex.get'; lang: string; lemmas: string[] }
  | { op: 'lex.events'; lang: string; events: { lemma: string; event: LexEvent }[] }
  | { op: 'card.save'; lang: string; lemma: string; card: SaveCardInput }
);

export type LexResponse =
  { ok: true; info: Record<string, WordInfo> } | { ok: false; error: string };
