/** Kokoro voice requests: page/content → background → offscreen document (where the model runs). */
export type TtsRequest =
  | { op: 'tts.status' }
  | { op: 'tts.load'; gpu?: boolean }
  | { op: 'tts.speak'; text: string; voice: string; speed: number; gpu?: boolean };

export interface TtsStatus {
  loaded: boolean;
  loading: boolean;
  error?: string;
  /** CPU threads the model may use (1 unless the page is cross-origin isolated). */
  threads?: number;
  /** Where the loaded model runs. */
  device?: 'wasm' | 'webgpu';
  /** Set when the graphics chip was requested but couldn't be used (we fell back to the CPU). */
  gpuError?: string;
}

export interface TtsClipMessage {
  /** Base64 WAV. */
  wav: string;
  seconds: number;
}

/** Broadcast while the model downloads. */
export interface TtsProgressEvent {
  type: 'slang-tts-progress';
  fraction: number;
}

export function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

export function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(s.length));
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
