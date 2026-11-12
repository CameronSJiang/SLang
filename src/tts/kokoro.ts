/**
 * Kokoro-82M text-to-speech, on-device (onnxruntime-web via transformers.js).
 * Runs in an extension document (offscreen/options). The model (~90 MB) and
 * voice files download once from Hugging Face and are cached by the browser.
 * Inference follows kokoro-js (Apache-2.0); phonemes come from our own G2P so
 * non-English voices work.
 */
import {
  AutoTokenizer,
  env,
  RawAudio,
  StyleTextToSpeech2Model,
  Tensor,
} from '@huggingface/transformers';
import { browser } from 'wxt/browser';
import { phonemizeSpanish } from '../core/g2p/es';

export const KOKORO_MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const VOICE_URL = (v: string) =>
  `https://huggingface.co/${KOKORO_MODEL}/resolve/main/voices/${v}.bin`;
const SAMPLE_RATE = 24000;
const STYLE_DIM = 256;

export type KokoroVoice = string;

// ONNX runtime files ship inside the extension (MV3 forbids remote code).
const wasm = env.backends.onnx.wasm;
if (wasm) {
  wasm.wasmPaths = browser.runtime.getURL('/ort/' as '/');
  wasm.numThreads = globalThis.crossOriginIsolated
    ? Math.min(4, navigator.hardwareConcurrency || 1)
    : 1;
}
env.allowLocalModels = false;

export const kokoroThreads = (): number => env.backends.onnx.wasm?.numThreads ?? 1;

type Progress = (fraction: number) => void;

let loading: Promise<{
  model: StyleTextToSpeech2Model;
  tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>;
}> | null = null;
const voices = new Map<string, Promise<Float32Array>>();

/** Load (downloading the first time) the model and tokenizer. */
export function loadKokoro(onProgress?: Progress) {
  if (!loading) {
    const files = new Map<string, { loaded: number; total: number }>();
    const progress_callback = (p: {
      status: string;
      file?: string;
      loaded?: number;
      total?: number;
    }) => {
      if (p.status !== 'progress' || !p.file || !p.total) return;
      files.set(p.file, { loaded: p.loaded ?? 0, total: p.total });
      let loaded = 0;
      let total = 0;
      for (const f of files.values()) {
        loaded += f.loaded;
        total += f.total;
      }
      onProgress?.(total ? loaded / total : 0);
    };
    loading = Promise.all([
      StyleTextToSpeech2Model.from_pretrained(KOKORO_MODEL, {
        dtype: 'q8',
        device: 'wasm',
        progress_callback,
      }),
      AutoTokenizer.from_pretrained(KOKORO_MODEL, { progress_callback }),
    ]).then(([model, tokenizer]) => ({ model, tokenizer }));
    loading.catch(() => (loading = null));
  }
  return loading;
}

async function voiceData(voice: string): Promise<Float32Array> {
  let v = voices.get(voice);
  if (!v) {
    v = (async () => {
      const cache = await caches.open('kokoro-voices').catch(() => null);
      let res = await cache?.match(VOICE_URL(voice));
      if (!res) {
        res = await fetch(VOICE_URL(voice));
        if (!res.ok) throw new Error(`Voice ${voice} download failed (${res.status})`);
        await cache?.put(VOICE_URL(voice), res.clone());
      }
      return new Float32Array(await res.arrayBuffer());
    })();
    v.catch(() => voices.delete(voice));
    voices.set(voice, v);
  }
  return v;
}

export interface Clip {
  /** 16-bit mono PCM WAV. */
  wav: ArrayBuffer;
  seconds: number;
}

/** Speak `text` (Spanish) with a Kokoro voice. */
export async function synthesize(text: string, voice: KokoroVoice, speed = 1): Promise<Clip> {
  const { model, tokenizer } = await loadKokoro();
  const phonemes = phonemizeSpanish(text, 'es');
  const { input_ids } = tokenizer(phonemes, { truncation: true }) as { input_ids: Tensor };
  const n = Math.min(Math.max((input_ids.dims.at(-1) ?? 2) - 2, 0), 509);
  const style = (await voiceData(voice)).slice(n * STYLE_DIM, n * STYLE_DIM + STYLE_DIM);
  const { waveform } = (await model({
    input_ids,
    style: new Tensor('float32', style, [1, STYLE_DIM]),
    speed: new Tensor('float32', [speed], [1]),
  })) as { waveform: Tensor };
  const audio = new RawAudio(waveform.data as Float32Array, SAMPLE_RATE);
  return { wav: audio.toWav(), seconds: (waveform.data as Float32Array).length / SAMPLE_RATE };
}
