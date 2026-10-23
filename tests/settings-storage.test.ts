import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { loadSettings, saveSettings, watchSettings } from '../src/storage/settings';
import { DEFAULT_SETTINGS } from '../src/core/settings';

describe('settings storage', () => {
  beforeEach(() => fakeBrowser.reset());

  it('loads defaults when nothing is stored', async () => {
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('persists a patch in storage.local', async () => {
    await saveSettings({ level: 'B2', anthropicApiKey: 'sk-ant-x' });
    const s = await loadSettings();
    expect(s.level).toBe('B2');
    expect(s.anthropicApiKey).toBe('sk-ant-x');
    expect(s.targetLang).toBe('es');
    expect(await fakeBrowser.storage.sync.get()).toEqual({});
  });

  it('notifies watchers', async () => {
    const seen: string[] = [];
    const stop = watchSettings((s) => seen.push(s.glossDensity));
    await saveSettings({ glossDensity: 'low' });
    stop();
    expect(seen).toEqual(['low']);
  });
});
