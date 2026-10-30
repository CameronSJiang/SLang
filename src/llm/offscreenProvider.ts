/**
 * Background-side proxy for the Chrome AI provider, which has to run in an
 * extension document (built-in AI APIs aren't reliably exposed to service
 * workers).
 */
import { browser } from 'wxt/browser';
import type { AnnotatedCue, Cue } from '../core/types';
import type { OffscreenRequest, OffscreenResponse } from './messages';
import { InvalidResponseError, ProviderUnavailableError, type LLMProvider } from './types';

const OFFSCREEN_URL = '/offscreen.html';
let creating: Promise<void> | null = null;

async function ensureOffscreen(): Promise<void> {
  if (await browser.offscreen.hasDocument()) return;
  creating ??= browser.offscreen
    .createDocument({
      url: browser.runtime.getURL(OFFSCREEN_URL),
      reasons: [browser.offscreen.Reason.WORKERS],
      justification:
        'Runs Chrome built-in AI (Prompt and Translator APIs) on caption text, on-device.',
    })
    .finally(() => (creating = null));
  await creating;
}

type DistOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

async function call(req: DistOmit<OffscreenRequest, 'target'>): Promise<unknown> {
  await ensureOffscreen();
  const res = (await browser.runtime.sendMessage({ ...req, target: 'offscreen' })) as
    OffscreenResponse | undefined;
  if (!res) throw new Error('Offscreen document did not answer');
  if (res.ok) return res.value;
  if (res.unavailable) throw new ProviderUnavailableError(res.error);
  if (res.invalid) throw new InvalidResponseError(res.error);
  throw new Error(res.error);
}

export const offscreenChromeAI: LLMProvider = {
  id: 'chrome-ai',
  chunkSize: 6,
  available: async () => {
    try {
      return (await call({ op: 'available' })) === true;
    } catch {
      return false;
    }
  },
  annotate: async (cues, ctx) => (await call({ op: 'annotate', cues, ctx })) as AnnotatedCue[],
  translateCues: async (cues, from, to) =>
    (await call({ op: 'translateCues', cues, from, to })) as Cue[],
  translateLine: async (text, from, to) => {
    const out = (await call({
      op: 'translateCues',
      cues: [{ id: 'l', start: 0, end: 0, text }],
      from,
      to,
    })) as Cue[];
    return out[0]?.text ?? '';
  },
};
