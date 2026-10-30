import { browser } from 'wxt/browser';
import { transcriptKey } from '@/src/storage/db';
import { loadSettings } from '@/src/storage/settings';
import { dexieTranscriptCache } from '@/src/storage/transcripts';
import { applyLexEvents, getWordInfo, saveCard } from '@/src/storage/lexicon';
import type { LexRequest, LexResponse } from '@/src/storage/lexMessages';
import { AnnotationJob } from '@/src/llm/annotator';
import { TranslationJob } from '@/src/llm/translationJob';
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

/** Providers that might translate, in the user's order (Chrome AI's Translator needs no Prompt model). */
function translators(s: Settings): LLMProvider[] {
  return s.providers.flatMap((id): LLMProvider[] =>
    id === 'chrome-ai'
      ? [offscreenChromeAI]
      : id === 'anthropic' && s.anthropicApiKey
        ? [new AnthropicProvider(s.anthropicApiKey)]
        : [],
  );
}

async function handleLex(req: LexRequest): Promise<LexResponse> {
  const s = await loadSettings();
  switch (req.op) {
    case 'lex.get':
      return { ok: true, info: await getWordInfo(req.lang, req.lemmas, s) };
    case 'lex.events':
      return { ok: true, info: await applyLexEvents(req.lang, req.events, s) };
    case 'card.save':
      await saveCard(req.lang, req.lemma, req.card);
      return {
        ok: true,
        info: await applyLexEvents(req.lang, [{ lemma: req.lemma, event: 'save' }], s),
      };
  }
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((msg: unknown, _sender, sendResponse) => {
    const req = msg as LexRequest | undefined;
    if (req?.target !== 'background') return false;
    handleLex(req).then(sendResponse, (e: unknown) =>
      sendResponse({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      } satisfies LexResponse),
    );
    return true; // async response
  });

  // One running job per transcript; several tabs can watch the same one.
  const jobs = new Map<string, { job: AnnotationJob | TranslationJob; ports: Set<Port> }>();

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
      key =
        msg.type === 'translate'
          ? transcriptKey(msg.site, msg.videoId, `${msg.from}>${msg.to}:dub`)
          : transcriptKey(msg.site, msg.videoId, `${msg.lang}>${settings.nativeLang}`);
      const existing = jobs.get(key);
      if (existing) {
        // Join the running job: replay what's cached so far, then get live updates.
        existing.ports.add(port);
        const row = await dexieTranscriptCache.get(key);
        const ready = row?.cues.filter((c) => c !== null) ?? [];
        if (ready.length) {
          send(
            msg.type === 'translate'
              ? { type: 'translated', cues: ready }
              : { type: 'chunk', cues: ready },
          );
        }
        existing.job.setPlayhead(msg.playhead);
        return;
      }
      const ports = new Set([port]);
      const jobKey = key;
      if (msg.type === 'translate') {
        const tjob = new TranslationJob({
          key: jobKey,
          cues: msg.cues,
          from: msg.from,
          to: msg.to,
          providers: translators(settings),
          cache: dexieTranscriptCache,
          onChunk: (cues) => ports.forEach((p) => post(p, { type: 'translated', cues })),
          onProgress: (progress) =>
            ports.forEach((p) => post(p, { type: 'translateProgress', progress })),
        });
        tjob.setPlayhead(msg.playhead);
        jobs.set(jobKey, { job: tjob, ports });
        void tjob.run().finally(() => jobs.delete(jobKey));
        return;
      }
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
