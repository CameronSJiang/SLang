// Hidden extension document that hosts Chrome built-in AI for the background worker.
import { browser } from 'wxt/browser';
import { ChromeAIProvider } from '@/src/llm/chromeAI';
import type { OffscreenRequest, OffscreenResponse } from '@/src/llm/messages';
import { InvalidResponseError, ProviderUnavailableError } from '@/src/llm/types';
import {
  kokoroThreads,
  loadKokoro,
  synthesize,
  webgpuUsable,
  type KokoroDevice,
  type KokoroVoice,
} from '@/src/tts/kokoro';
import { toBase64, type TtsProgressEvent, type TtsStatus } from '@/src/tts/messages';

let ttsState: TtsStatus = { loaded: false, loading: false };
/** The graphics chip failed once in this session: don't keep retrying it. */
let gpuBroken = false;
let gpuUnavailable = '';

const progress = (fraction: number) => {
  const e: TtsProgressEvent = { type: 'slang-tts-progress', fraction };
  void browser.runtime.sendMessage(e).catch(() => {});
};

/**
 * Load the voice model on the device the caller asked for (graphics chip falls back to CPU).
 * The setting comes with each request: offscreen documents can't read extension storage.
 */
async function loadTts(wantGpu: boolean): Promise<unknown> {
  let device: KokoroDevice = 'wasm';
  if (wantGpu && !gpuBroken) {
    if (await webgpuUsable()) device = 'webgpu';
    else gpuUnavailable = 'no usable graphics chip found';
  }
  if (ttsState.loaded && ttsState.device === device) return;
  ttsState = { loaded: false, loading: true };
  try {
    await loadKokoro(progress, device);
    ttsState = {
      loaded: true,
      loading: false,
      device,
      ...(wantGpu && device === 'wasm' && gpuUnavailable ? { gpuError: gpuUnavailable } : {}),
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    if (device === 'webgpu') {
      // The graphics chip didn't work out: use the CPU instead, and say why.
      await loadKokoro(progress, 'wasm').catch((e2: unknown) => {
        ttsState = {
          loaded: false,
          loading: false,
          error: e2 instanceof Error ? e2.message : String(e2),
        };
        throw e2;
      });
      ttsState = { loaded: true, loading: false, device: 'wasm', gpuError: error };
      gpuBroken = true;
      return;
    }
    ttsState = { loaded: false, loading: false, error };
    throw e;
  }
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
      await loadTts(!!req.gpu);
      return ttsState;
    case 'tts.speak': {
      await loadTts(!!req.gpu);
      let clip;
      try {
        clip = await synthesize(req.text, req.voice as KokoroVoice, req.speed);
      } catch (e) {
        if (ttsState.device !== 'webgpu') throw e;
        // The graphics chip loaded but can't run it: switch to the CPU for good and retry.
        const gpuError = e instanceof Error ? e.message : String(e);
        await loadKokoro(progress, 'wasm');
        ttsState = { loaded: true, loading: false, device: 'wasm', gpuError };
        gpuBroken = true;
        clip = await synthesize(req.text, req.voice as KokoroVoice, req.speed);
      }
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
