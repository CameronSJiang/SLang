import { describe, expect, it } from 'vitest';
import type { CachedTranscript, TranscriptCache } from '../src/llm/annotator';
import { TranslationJob } from '../src/llm/translationJob';
import { ProviderUnavailableError, type LLMProvider } from '../src/llm/types';
import type { Cue } from '../src/core/types';

const cues: Cue[] = Array.from({ length: 25 }, (_, i) => ({
  id: `c${i}`,
  start: i,
  end: i + 1,
  text: `line ${i}`,
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

function provider(
  id: LLMProvider['id'],
  fn: (texts: string[]) => string[] | 'dead',
): LLMProvider & { calls: number } {
  const p = {
    id,
    chunkSize: 30,
    calls: 0,
    available: async () => true,
    annotate: async () => [],
    translateLine: async () => '',
    translateCues: async (c: Cue[]) => {
      p.calls++;
      const r = fn(c.map((x) => x.text));
      if (r === 'dead') throw new ProviderUnavailableError('no');
      return c.map((x, i) => ({ ...x, text: r[i] ?? '' }));
    },
  };
  return p;
}

async function run(providers: LLMProvider[], cache: TranscriptCache, playhead = 0) {
  const got: Cue[] = [];
  const progress: { done: number; finished: boolean; error?: string }[] = [];
  const job = new TranslationJob({
    key: 'k',
    cues,
    from: 'en',
    to: 'es',
    providers,
    cache,
    onChunk: (c) => got.push(...c),
    onProgress: (p) => progress.push(p),
  });
  job.setPlayhead(playhead);
  await job.run();
  return { got, progress };
}

describe('TranslationJob', () => {
  it('translates playhead-first and is free on the second load', async () => {
    const cache = new MemCache();
    const order: string[] = [];
    const p = provider('anthropic', (t) => {
      order.push(t[0]!);
      return t.map((x) => `ES ${x}`);
    });
    const r = await run([p], cache, 26);
    expect(order).toEqual(['line 0']); // 25 cues fit one 30-cue chunk
    expect(r.got.map((c) => c.text)).toContain('ES line 24');
    expect(r.progress.at(-1)).toMatchObject({ done: 25, finished: true });

    const again = provider('anthropic', () => ['x']);
    const r2 = await run([again], cache);
    expect(again.calls).toBe(0);
    expect(r2.got).toHaveLength(25);
  });

  it('skips a provider that is unavailable and uses the next', async () => {
    const dead = provider('chrome-ai', () => 'dead');
    const ok = provider('anthropic', (t) => t.map((x) => `ES ${x}`));
    const r = await run([dead, ok], new MemCache());
    expect(dead.calls).toBe(1);
    expect(r.got[0]?.text).toBe('ES line 0');
  });

  it('reports an error when nothing can translate', async () => {
    const r = await run([provider('chrome-ai', () => 'dead')], new MemCache());
    expect(r.progress.at(-1)).toMatchObject({ finished: true, error: expect.any(String) });
    expect(r.got).toEqual([]);
  });
});
