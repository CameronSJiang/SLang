/**
 * Annotates a whole transcript in chunks, playhead-first, with caching.
 * Pure orchestration: providers and the cache are injected.
 */
import { hashCues } from '../core/annotation';
import { nextChunk, planChunks, type Chunk } from '../core/batching';
import type { LLMProviderId } from '../core/settings';
import type { AnnotatedCue, Cue } from '../core/types';
import { nullProvider } from './null';
import { ProviderUnavailableError, type LLMProvider } from './types';

export const CONTEXT_OVERLAP = 2;

export interface CachedTranscript {
  key: string;
  sourceHash: string;
  /** Annotated cues by index; null = not annotated yet. */
  cues: (AnnotatedCue | null)[];
  /** Which provider produced each cue. */
  by: (LLMProviderId | null)[];
  complete: boolean;
  updatedAt: number;
}

export interface TranscriptCache {
  get(key: string): Promise<CachedTranscript | undefined>;
  put(row: CachedTranscript): Promise<void>;
}

export interface AnnotationProgress {
  provider: LLMProviderId;
  done: number;
  total: number;
  finished: boolean;
  /** Set when the chosen provider failed for good and we fell back to Null. */
  error?: string;
}

export interface JobOptions {
  key: string;
  cues: Cue[];
  lang: string;
  nativeLang: string;
  /** The user's chosen, available provider (Null if none). */
  provider: LLMProvider;
  cache: TranscriptCache;
  onChunk(cues: AnnotatedCue[]): void;
  onProgress?(p: AnnotationProgress): void;
  concurrency?: number;
}

export class AnnotationJob {
  private playhead = 0;
  private stopped = false;
  private provider: LLMProvider;
  private error: string | undefined;

  constructor(private readonly o: JobOptions) {
    this.provider = o.provider;
  }

  setPlayhead(t: number): void {
    this.playhead = t;
  }

  stop(): void {
    this.stopped = true;
  }

  async run(): Promise<void> {
    const { cues, cache, key } = this.o;
    const sourceHash = hashCues(cues);
    const cached = await cache.get(key);
    const row: CachedTranscript =
      cached && cached.sourceHash === sourceHash && cached.cues.length === cues.length
        ? cached
        : {
            key,
            sourceHash,
            cues: cues.map(() => null),
            by: cues.map(() => null),
            complete: false,
            updatedAt: 0,
          };

    // A cue annotated by Null is only final if Null is all we have now.
    const isDone = (i: number) =>
      row.cues[i] !== null && (row.by[i] !== 'null' || this.provider.id === 'null');

    const ready = row.cues.filter((c, i): c is AnnotatedCue => c !== null && isDone(i));
    if (ready.length) this.o.onChunk(ready);

    const chunks = planChunks(cues.length, this.provider.chunkSize, CONTEXT_OVERLAP);
    const pending = new Set<number>();
    chunks.forEach((c, i) => {
      for (let j = c.start; j < c.end; j++) if (!isDone(j)) return void pending.add(i);
    });

    let done =
      cues.length - chunks.reduce((n, c, i) => n + (pending.has(i) ? c.end - c.start : 0), 0);
    const progress = (finished: boolean) =>
      this.o.onProgress?.({
        provider: this.provider.id,
        done,
        total: cues.length,
        finished,
        ...(this.error ? { error: this.error } : {}),
      });
    progress(pending.size === 0);
    if (!pending.size) {
      if (!row.complete) await cache.put({ ...row, complete: true, updatedAt: Date.now() });
      return;
    }

    const worker = async () => {
      for (;;) {
        if (this.stopped) return;
        const i = nextChunk(pending, chunks, cues, this.playhead);
        if (i === undefined) return;
        pending.delete(i);
        const c = chunks[i] as Chunk;
        const slice = cues.slice(c.start, c.end);
        const ctx = {
          lang: this.o.lang,
          nativeLang: this.o.nativeLang,
          context: cues.slice(c.contextStart, c.start),
        };
        const { result, by } = await this.annotateChunk(slice, ctx);
        result.forEach((a, k) => {
          row.cues[c.start + k] = a;
          row.by[c.start + k] = by;
        });
        done += slice.length;
        row.updatedAt = Date.now();
        await cache.put(row);
        this.o.onChunk(result);
        progress(false);
      }
    };
    await Promise.all(Array.from({ length: Math.max(1, this.o.concurrency ?? 1) }, worker));
    if (this.stopped) return;
    row.complete = row.by.every((b) => b !== null && (b !== 'null' || this.provider.id === 'null'));
    await cache.put(row);
    progress(true);
  }

  /** Try the provider, retry once, then fall back to Null for this chunk. */
  private async annotateChunk(
    slice: Cue[],
    ctx: { lang: string; nativeLang: string; context: Cue[] },
  ): Promise<{ result: AnnotatedCue[]; by: LLMProviderId }> {
    for (let attempt = 0; attempt < 2 && this.provider.id !== 'null'; attempt++) {
      try {
        const result = await this.provider.annotate(slice, ctx);
        if (result.length === slice.length) return { result, by: this.provider.id };
      } catch (e) {
        if (e instanceof ProviderUnavailableError) {
          // Don't keep hammering a provider that can't work (bad key, no model).
          this.error = e.message;
          this.provider = nullProvider;
          break;
        }
      }
    }
    return { result: await nullProvider.annotate(slice, ctx), by: 'null' };
  }
}
