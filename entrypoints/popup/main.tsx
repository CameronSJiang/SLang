import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
import { PLAYBACK_PRESETS, type PlaybackPreset } from '@/src/core/playback';
import type { Settings } from '@/src/core/settings';
import { PRESET_SHORT } from '@/src/ui/presets';
import { loadSettings, saveSettings } from '@/src/storage/settings';

const isYouTube = (url?: string) => !!url && /^https?:\/\/([^/]+\.)?youtube\.com\//.test(url);

async function activeTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function Popup() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tabUrl, setTabUrl] = useState<string | undefined>();
  const [message, setMessage] = useState('');

  useEffect(() => {
    void loadSettings().then(setSettings);
    void activeTab().then((t) => setTabUrl(t?.url));
  }, []);

  const showOnPage = async () => {
    const tab = await activeTab();
    if (tab?.id === undefined) return;
    try {
      const [probe] = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.querySelector('video') !== null,
      });
      if (!probe?.result) {
        setMessage('No video found on this page.');
        return;
      }
      await browser.scripting.executeScript({ target: { tabId: tab.id }, files: ['/html5.js'] });
      setMessage('Captions on. Turn on the video’s own subtitles if nothing shows.');
    } catch {
      setMessage('SLang can’t run on this page.');
    }
  };

  return (
    <main style={{ minWidth: '240px', fontFamily: 'system-ui, sans-serif', fontSize: '14px' }}>
      <h1 style={{ fontSize: '16px', margin: '4px 0 10px' }}>SLang</h1>
      {settings && (
        <label style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={settings.overlayEnabled}
            onChange={(e) =>
              void saveSettings({ overlayEnabled: e.currentTarget.checked }).then(setSettings)
            }
          />
          Captions overlay
        </label>
      )}
      {settings && (
        <label style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '8px' }}>
          Mode
          <select
            value={settings.playbackPreset}
            onChange={(e) =>
              void saveSettings({
                playbackPreset: e.currentTarget.value as PlaybackPreset,
              }).then(setSettings)
            }
          >
            {PLAYBACK_PRESETS.map((p) => (
              <option key={p} value={p}>
                {PRESET_SHORT[p]}
              </option>
            ))}
          </select>
        </label>
      )}
      <p style={{ margin: '10px 0' }}>
        {isYouTube(tabUrl) ? (
          <span style={{ opacity: 0.7 }}>Runs automatically on YouTube.</span>
        ) : (
          <button onClick={() => void showOnPage()}>Show captions on this page</button>
        )}
      </p>
      {message && <p style={{ margin: '0 0 10px' }}>{message}</p>}
      <button onClick={() => browser.runtime.openOptionsPage()}>Settings</button>{' '}
      <button onClick={() => browser.tabs.create({ url: browser.runtime.getURL('/review.html') })}>
        Review
      </button>
    </main>
  );
}

render(<Popup />, document.getElementById('app') as HTMLElement);
