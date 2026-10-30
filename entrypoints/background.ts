import { browser } from 'wxt/browser';
import { transcriptKey } from '@/src/storage/db';
import { loadSettings } from '@/src/storage/settings';
import { dexieTranscriptCache } from '@/src/storage/transcripts';
import { AnnotationJob } from '@/src/llm/annotator';
import { AnthropicProvider } from '@/src/llm/anthropic';
import { ANNOTATE_PORT, type AnnotateEvent, type AnnotateRequest } from '@/src/llm/messages';
import { nullProvider } from '@/src/llm/null';
import { offscreenChromeAI } from '@/src/llm/offscreenProvider';
import type { LLMProvider } from '@/src/llm/types';
import type { Settings } from '@/src/core/settings';

/** First provider in the user's order that's ready to use. */
async function pickProvider(s: Settings): Promise<LLMProvider> {
  for (const id of s.providers) {
    const p =
      id === 'anthropic'
        ? new AnthropicProvider(s.anthropicApiKey)
        : id === 'chrome-ai'
          ? offscreenChromeAI
          : nullProvider;
    if (await p.available()) return p;
  }
  return nullProvider;
}

type Port = ReturnType<typeof browser.runtime.connect>;

function post(port: Port, e: AnnotateEvent) {
  try {
    port.postMessage(e);
  } catch {
    // port closed
  }
}

export default defineBackground(() => {
  // One running job per transcript; several tabs can watch the same one.
  const jobs = new Map<string, { job: AnnotationJob; ports: Set<Port> }>();

  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== ANNOTATE_PORT) return;
    let key: string | null = null;
    const send = (e: AnnotateEvent) => post(port, e);

    port.onMessage.addListener(async (msg: AnnotateRequest) => {
      if (msg.type === 'playhead') {
        if (key) jobs.get(key)?.job.setPlayhead(msg.t);
        return;
      }
      const settings = await loadSettings();
      // Glosses are in the native language, so it's part of the key.
      key = transcriptKey(msg.site, msg.videoId, `${msg.lang}>${settings.nativeLang}`);
      const existing = jobs.get(key);
      if (existing) {
        // Join the running job: replay what's cached so far, then get live updates.
        existing.ports.add(port);
        const row = await dexieTranscriptCache.get(key);
        const ready = row?.cues.filter((c) => c !== null) ?? [];
        if (ready.length) send({ type: 'chunk', cues: ready });
        existing.job.setPlayhead(msg.playhead);
        return;
      }
      const ports = new Set([port]);
      const jobKey = key;
      const provider = await pickProvider(settings);
      const job = new AnnotationJob({
        key: jobKey,
        cues: msg.cues,
        lang: msg.lang,
        nativeLang: settings.nativeLang,
        provider,
        cache: dexieTranscriptCache,
        // On-device models run one prompt at a time; the API handles a couple in parallel.
        concurrency: provider.id === 'anthropic' ? 2 : 1,
        onChunk: (cues) => ports.forEach((p) => post(p, { type: 'chunk', cues })),
        onProgress: (progress) => ports.forEach((p) => post(p, { type: 'progress', progress })),
      });
      job.setPlayhead(msg.playhead);
      jobs.set(jobKey, { job, ports });
      // Keep going after the tab leaves so the cache fills; drop it when done.
      void job.run().finally(() => jobs.delete(jobKey));
    });

    port.onDisconnect.addListener(() => {
      if (key) jobs.get(key)?.ports.delete(port);
    });
  });
});
