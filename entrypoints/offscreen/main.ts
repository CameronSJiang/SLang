// Hidden extension document that hosts Chrome built-in AI for the background worker.
import { browser } from 'wxt/browser';
import { ChromeAIProvider } from '@/src/llm/chromeAI';
import type { OffscreenRequest, OffscreenResponse } from '@/src/llm/messages';
import { InvalidResponseError, ProviderUnavailableError } from '@/src/llm/types';
import { kokoroThreads, loadKokoro, synthesize, type KokoroVoice } from '@/src/tts/kokoro';
import { toBase64, type TtsProgressEvent, type TtsStatus } from '@/src/tts/messages';

let ttsState: TtsStatus = { loaded: false, loading: false };

function loadTts(): Promise<unknown> {
  if (ttsState.loaded) return Promise.resolve();
  ttsState = { loaded: false, loading: true };
  return loadKokoro((fraction) => {
    const e: TtsProgressEvent = { type: 'slang-tts-progress', fraction };
    void browser.runtime.sendMessage(e).catch(() => {});
  }).then(
    () => (ttsState = { loaded: true, loading: false }),
    (e: unknown) => {
      ttsState = {
        loaded: false,
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      };
      throw e;
    },
  );
}

const provider = new ChromeAIProvider();

async function handle(req: OffscreenRequest): Promise<unknown> {
  switch (req.op) {
    case 'available':
      return provider.available();
    case 'annotate':
      return provider.annotate(req.cues, req.ctx);
    case 'translateCues':
      return provider.translateCues(req.cues, req.from, req.to);
    case 'translateLines':
      return provider.translateLines(req.texts, req.from, req.to);
    case 'tts.status':
      return { ...ttsState, threads: kokoroThreads() };
    case 'tts.load':
      await loadTts();
      return ttsState;
    case 'tts.speak': {
      await loadTts();
      const clip = await synthesize(req.text, req.voice as KokoroVoice, req.speed);
      return { wav: toBase64(clip.wav), seconds: clip.seconds };
    }
  }
}

browser.runtime.onMessage.addListener((msg: unknown, _sender, sendResponse) => {
  const req = msg as OffscreenRequest | undefined;
  if (req?.target !== 'offscreen') return false;
  handle(req).then(
    (value) => sendResponse({ ok: true, value } satisfies OffscreenResponse),
    (e: unknown) =>
      sendResponse({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        unavailable: e instanceof ProviderUnavailableError,
        invalid: e instanceof InvalidResponseError,
      } satisfies OffscreenResponse),
  );
  return true; // async response
});
