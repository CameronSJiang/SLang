import { browser } from 'wxt/browser';
import { normalizeSettings, type Settings } from '../core/settings';

// Stored in chrome.storage.local only (never sync) so the API key stays on this device.
const KEY = 'settings';

export async function loadSettings(): Promise<Settings> {
  const got = await browser.storage.local.get(KEY);
  return normalizeSettings(got[KEY]);
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = normalizeSettings({ ...(await loadSettings()), ...patch });
  await browser.storage.local.set({ [KEY]: next });
  return next;
}

export function watchSettings(cb: (s: Settings) => void): () => void {
  const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    if (area === 'local' && KEY in changes) cb(normalizeSettings(changes[KEY]?.newValue));
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
