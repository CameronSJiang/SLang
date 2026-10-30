import { describe, expect, it } from 'vitest';
import { AnnotationJob, type CachedTranscript, type TranscriptCache } from '../src/llm/annotator';
import { nullAnnotate } from '../src/core/annotation';
import { ProviderUnavailableError, type LLMProvider } from '../src/llm/types';
import type { AnnotatedCue, Cue } from '../src/core/types';

const cues: Cue[] = Array.from({ length: 10 }, (_, i) => ({
  id: `c${i}`,
  start: i * 2,
  end: i * 2 + 2,
  text: `palabra número ${i}`,
}));

class MemCache implements TranscriptCache {
  rows = new Map<string, CachedTranscript>();
  async get(k: string) {
    const r = this.rows.get(k);
    return r && structuredClone(r);
  }
  async put(r: CachedTranscript) {
    this.rows.set(r.key, structuredClone(r));
  }
}

function fakeProvider(
  behaviour: (call: number, cues: Cue[]) => 'ok' | 'bad' | 'dead' = () => 'ok',
) {
  const calls: number[] = [];
  const p: LLMProvider = {
    id: 'anthropic',
    chunkSize: 4,
    available: async () => true,
    annotate: async (slice, ctx) => {
      calls.push(slice[0]!.start);
      const b = behaviour(calls.length, slice);
      if (b === 'dead') throw new ProviderUnavailableError('bad key');
      if (b === 'bad') throw new Error('invalid');
      return nullAnnotate(slice, ctx.lang).map((c) => ({ ...c, l1: `EN ${c.text}` }));
    },
    translateLine: async () => '',
    translateCues: async (c) => c,
  };
  return { p, calls };
}

async function run(provider: LLMProvider, cache: TranscriptCache, playhead = 0) {
  const got: AnnotatedCue[] = [];
  const progress: { done: number; finished: boolean; error?: string }[] = [];
  const job = new AnnotationJob({
    key: 'yt:v:es:1',
    cues,
    lang: 'es',
    nativeLang: 'en',
    provider,
    cache,
    onChunk: (c) => got.push(...c),
    onProgress: (p) => progress.push(p),
  });
  job.setPlayhead(playhead);
  await job.run();
  return { got, progress };
}

describe('AnnotationJob', () => {
  it('annotates playhead-first and makes zero calls on the second load', async () => {
    const cache = new MemCache();
    const first = fakeProvider();
    const r1 = await run(first.p, cache, 9);
    expect(first.calls).toEqual([8, 16, 0]); // chunk around t=9 first, then forward, then back
    expect(r1.got).toHaveLength(10);
    expect(r1.progress.at(-1)).toMatchObject({ done: 10, finished: true });

    const second = fakeProvider();
    const r2 = await run(second.p, cache);
    expect(second.calls).toEqual([]);
    expect(r2.got.map((c) => c.l1)).toEqual(cues.map((c) => `EN ${c.text}`));
  });

  it('retries a failed chunk once, then falls back to Null for it', async () => {
    const cache = new MemCache();
    const { p, calls } = fakeProvider((n, slice) => (slice[0]!.start === 0 ? 'bad' : 'ok'));
    const { got } = await run(p, cache);
    expect(calls.filter((s) => s === 0)).toHaveLength(2);
    expect(got.find((c) => c.id === 'c0')?.l1).toBeUndefined();
    expect(got.find((c) => c.id === 'c9')?.l1).toBe('EN palabra número 9');
    // Null-annotated chunks are retried next time a real provider is available.
    const retry = fakeProvider();
    await run(retry.p, cache);
    expect(retry.calls).toEqual([0]);
  });

  it('stops calling a provider that is unavailable for good', async () => {
    const cache = new MemCache();
    const { p, calls } = fakeProvider(() => 'dead');
    const { got, progress } = await run(p, cache);
    expect(calls).toHaveLength(1);
    expect(got).toHaveLength(10);
    expect(progress.at(-1)).toMatchObject({ finished: true, error: 'bad key' });
  });

  it('ignores a cache entry for a different transcript', async () => {
    const cache = new MemCache();
    await run(fakeProvider().p, cache);
    cues[3] = { ...cues[3]!, text: 'cambiado' };
    const again = fakeProvider();
    await run(again.p, cache);
    expect(again.calls.length).toBe(3);
  });
});

describe('fast line pass', () => {
  it('translates all lines first, then words, keeping the line translations', async () => {
    const cache = new MemCache();
    const { p, calls } = fakeProvider();
    const lineCalls: string[][] = [];
    p.translateLines = async (texts) => {
      lineCalls.push(texts);
      return texts.map((t) => `LINE ${t}`);
    };
    const events: string[] = [];
    const job = new AnnotationJob({
      key: 'yt:v:es:1',
      cues,
      lang: 'es',
      nativeLang: 'en',
      provider: p,
      cache,
      onChunk: (c) => events.push(`${c.length}:${c[0]?.l1?.split(' ')[0]}`),
      onProgress: (pr) => events.push(`${pr.phase}:${pr.done}`),
    });
    await job.run();
    expect(lineCalls).toHaveLength(1); // 10 cues fit one 20-cue line chunk
    expect(events.slice(0, 2)).toEqual(['10:LINE', 'lines:1']);
    expect(calls).toHaveLength(3);
    const row = await cache.get('yt:v:es:1');
    // The word pass returned its own l1 ("EN …"); the provider's result wins when present.
    expect(row?.cues.every((c) => c?.l1)).toBe(true);
    expect(row?.complete).toBe(true);

    const again = fakeProvider();
    again.p.translateLines = async () => {
      throw new Error('should not be called');
    };
    await run(again.p, cache);
    expect(again.calls).toEqual([]);
  });
});
