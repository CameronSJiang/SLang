/** Ask the background (→ offscreen document) for Kokoro speech. Usable from content scripts and pages. */
import { browser } from 'wxt/browser';
import type { TtsClipMessage, TtsRequest, TtsStatus } from './messages';

async function ask<T>(req: TtsRequest): Promise<T> {
  const res = (await browser.runtime.sendMessage({ ...req, target: 'background' })) as
    { ok: true; value: T } | { ok: false; error: string } | undefined;
  if (!res) throw new Error('No response from SLang');
  if (!res.ok) throw new Error(res.error);
  return res.value;
}

export const ttsStatus = () => ask<TtsStatus>({ op: 'tts.status' });
export const ttsLoad = () => ask<TtsStatus>({ op: 'tts.load' });
export const ttsSpeak = (text: string, voice: string, speed = 1) =>
  ask<TtsClipMessage>({ op: 'tts.speak', text, voice, speed });
