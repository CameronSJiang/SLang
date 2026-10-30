/**
 * Translates a source transcript into the target language for dub mode,
 * chunked and playhead-first, cached like annotations. No Null fallback:
 * without a translation there's nothing to dub.
 */
import { hashCues } from '../core/annotation';
import { nextChunk, planChunks, type Chunk } from '../core/batching';
import type { Cue } from '../core/types';
import type { CachedTranscript, TranscriptCache } from './annotator';
import { ProviderUnavailableError, type LLMProvider } from './types';

export interface TranslationProgress {
  done: number;
  total: number;
  finished: boolean;
  error?: string;
}

export interface TranslationJobOptions {
  key: string;
  cues: Cue[];
  from: string;
  to: string;
  /** Providers to try in order; one that turns out unavailable is skipped. */
  providers: LLMProvider[];
  cache: TranscriptCache;
  onChunk(cues: Cue[]): void;
  onProgress?(p: TranslationProgress): void;
}

const toCue = ({ id, start, end, text }: Cue): Cue => ({ id, start, end, text });

export class TranslationJob {
  private playhead = 0;
  private stopped = false;

  constructor(private readonly o: TranslationJobOptions) {}

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

    const ready = row.cues.filter((c) => c !== null).map(toCue);
    if (ready.length) this.o.onChunk(ready);

    const providers = [...this.o.providers];
    let done = ready.length;
    const progress = (finished: boolean, error?: string) =>
      this.o.onProgress?.({ done, total: cues.length, finished, ...(error ? { error } : {}) });
    if (done === cues.length) {
      progress(true);
      return;
    }
    if (!providers.length) {
      progress(true, 'No translation provider is set up');
      return;
    }

    // Fast line translators (Chrome Translator) take bigger chunks than LLM prompts.
    const size = providers[0]?.translateLines ? 20 : 30;
    const chunks = planChunks(cues.length, size, 0);
    const pending = new Set<number>();
    chunks.forEach((c, i) => {
      for (let j = c.start; j < c.end; j++) if (!row.cues[j]) return void pending.add(i);
    });
    progress(false);

    while (!this.stopped) {
      const i = nextChunk(pending, chunks, cues, this.playhead);
      if (i === undefined) break;
      pending.delete(i);
      const c = chunks[i] as Chunk;
      const slice = cues.slice(c.start, c.end);
      const texts = await this.translate(slice, providers);
      if (!texts) {
        progress(
          true,
          providers.length ? 'Translation failed' : 'No translation provider is ready',
        );
        return;
      }
      const out = slice.map((cue, k) => ({ ...toCue(cue), text: texts[k] ?? '' }));
      out.forEach((cue, k) => {
        row.cues[c.start + k] = { ...cue, tokens: [] };
        row.by[c.start + k] = providers[0]?.id ?? null;
      });
      done += slice.length;
      row.updatedAt = Date.now();
      await cache.put(row);
      this.o.onChunk(out.filter((x) => x.text));
      progress(false);
    }
    if (this.stopped) return;
    row.complete = row.cues.every((x) => x !== null);
    await cache.put(row);
    progress(true);
  }

  /** Translate with the first working provider (retry once each). Mutates `providers` to drop dead ones. */
  private async translate(slice: Cue[], providers: LLMProvider[]): Promise<string[] | null> {
    while (providers.length) {
      const p = providers[0] as LLMProvider;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const texts = p.translateLines
            ? await p.translateLines(
                slice.map((x) => x.text),
                this.o.from,
                this.o.to,
              )
            : (await p.translateCues(slice, this.o.from, this.o.to)).map((x) => x.text);
          if (texts.length === slice.length) return texts;
        } catch (e) {
          if (e instanceof ProviderUnavailableError) break;
        }
      }
      providers.shift(); // this provider can't do it; try the next
    }
    return null;
  }
}
