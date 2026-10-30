/** Content-script side of the learner lexicon (the database lives in the background). */
import { browser } from 'wxt/browser';
import type { WordInfo } from '../core/glossPolicy';
import { lemmaKey, type LexEvent } from '../core/learner';
import type { LexRequest, LexResponse } from './lexMessages';
import type { SaveCardInput } from './lexicon';
import { extensionAlive } from './settings';

type DistOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

async function ask(req: DistOmit<LexRequest, 'target'>): Promise<Record<string, WordInfo>> {
  if (!extensionAlive()) return {};
  const res = (await browser.runtime.sendMessage({ ...req, target: 'background' })) as
    LexResponse | undefined;
  if (!res?.ok) throw new Error(res ? res.error : 'No response from background');
  return res.info;
}

/**
 * Caches WordInfo per lemma for one language, fetches unknown lemmas in
 * batches, and applies learner events. `onChange` fires when info changes.
 */
export class LexiconClient {
  private info = new Map<string, WordInfo>();
  private pending = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    readonly lang: string,
    private readonly onChange: () => void,
  ) {}

  get(lemma: string): WordInfo | undefined {
    return this.info.get(lemmaKey(lemma));
  }

  /** Make sure these lemmas are loaded (batched, ~50ms). */
  want(lemmas: Iterable<string>): void {
    for (const l of lemmas) {
      const k = lemmaKey(l);
      if (k && !this.info.has(k)) this.pending.add(k);
    }
    if (this.pending.size && !this.timer) this.timer = setTimeout(() => void this.flush(), 50);
  }

  private async flush() {
    this.timer = null;
    const lemmas = [...this.pending];
    this.pending.clear();
    if (!lemmas.length) return;
    this.merge(await ask({ op: 'lex.get', lang: this.lang, lemmas }).catch(() => ({})));
  }

  async event(events: { lemma: string; event: LexEvent }[]): Promise<void> {
    if (!events.length) return;
    this.merge(await ask({ op: 'lex.events', lang: this.lang, events }).catch(() => ({})));
  }

  async save(lemma: string, card: SaveCardInput): Promise<void> {
    this.merge(await ask({ op: 'card.save', lang: this.lang, lemma, card }));
  }

  /** Forget cached info (e.g. the level changed, so priors moved). */
  reset(): void {
    const lemmas = [...this.info.keys()];
    this.info.clear();
    this.want(lemmas);
  }

  private merge(next: Record<string, WordInfo>) {
    const keys = Object.keys(next);
    if (!keys.length) return;
    for (const k of keys) this.info.set(k, next[k] as WordInfo);
    this.onChange();
  }
}
