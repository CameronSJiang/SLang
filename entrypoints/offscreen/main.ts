// Hidden extension document that hosts Chrome built-in AI for the background worker.
import { browser } from 'wxt/browser';
import { ChromeAIProvider } from '@/src/llm/chromeAI';
import type { OffscreenRequest, OffscreenResponse } from '@/src/llm/messages';
import { InvalidResponseError, ProviderUnavailableError } from '@/src/llm/types';

const provider = new ChromeAIProvider();

async function handle(req: OffscreenRequest): Promise<unknown> {
  switch (req.op) {
    case 'available':
      return provider.available();
    case 'annotate':
      return provider.annotate(req.cues, req.ctx);
    case 'translateCues':
      return provider.translateCues(req.cues, req.from, req.to);
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
