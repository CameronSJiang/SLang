import { browser } from 'wxt/browser';
import { normalizeSettings, type Settings } from '../core/settings';

// Stored in chrome.storage.local only (never sync) so the API key stays on this device.
const KEY = 'settings';

/**
 * A content script left running in an open tab after the extension reloads
 * loses its extension APIs (storage becomes undefined). Callers in content
 * scripts check this and stop quietly.
 */
export class ExtensionReloadedError extends Error {
  override name = 'ExtensionReloadedError';
  constructor() {
    super('SLang was updated or reloaded; reload this page to keep using it.');
  }
}

export const extensionAlive = (): boolean => !!browser.runtime?.id && !!browser.storage?.local;

function local() {
  const area = browser.storage?.local;
  if (!area) throw new ExtensionReloadedError();
  return area;
}

export async function loadSettings(): Promise<Settings> {
  const got = await local().get(KEY);
  return normalizeSettings(got[KEY]);
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = normalizeSettings({ ...(await loadSettings()), ...patch });
  await local().set({ [KEY]: next });
  return next;
}

export function watchSettings(cb: (s: Settings) => void): () => void {
  const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    if (area === 'local' && KEY in changes) cb(normalizeSettings(changes[KEY]?.newValue));
  };
  const events = browser.storage?.onChanged;
  events?.addListener(listener);
  return () => {
    try {
      events?.removeListener(listener);
    } catch {
      // extension context already gone
    }
  };
}
