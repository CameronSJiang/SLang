import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
import { PLAYBACK_PRESETS } from '@/src/core/playback';
import { LANGUAGES, type Settings } from '@/src/core/settings';
import { PRESET_INFO } from '@/src/ui/presets';
import { Toggle } from '@/src/ui/settings/kit';
import { loadSettings, saveSettings } from '@/src/storage/settings';
import '@/src/ui/settings/page.css';
import './popup.css';

const isYouTube = (url?: string) => !!url && /^https?:\/\/([^/]+\.)?youtube\.com\//.test(url);

async function activeTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}

const openPage = (path: '/welcome.html' | '/review.html') =>
  void browser.tabs.create({ url: browser.runtime.getURL(path) });

function Popup() {
  const [s, setS] = useState<Settings | null>(null);
  const [tabUrl, setTabUrl] = useState<string | undefined>();
  const [message, setMessage] = useState('');

  useEffect(() => {
    void loadSettings().then(setS);
    void activeTab().then((t) => setTabUrl(t?.url));
  }, []);

  const update = (patch: Partial<Settings>) => void saveSettings(patch).then(setS);

  const showOnPage = async () => {
    const tab = await activeTab();
    if (tab?.id === undefined) return;
    try {
      const [probe] = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.querySelector('video') !== null,
      });
      if (!probe?.result) {
        setMessage('No video on this page. 🤷');
        return;
      }
      await browser.scripting.executeScript({ target: { tabId: tab.id }, files: ['/html5.js'] });
      setMessage('Captions on! Turn on the video’s own subtitles if nothing shows.');
    } catch {
      setMessage('SLang can’t run on this page.');
    }
  };

  if (!s) return null;

  return (
    <main class="popup">
      <header class="popup-head">
        <img src="/icon/48.png" width="34" height="34" alt="" />
        <div>
          <b>SLang</b>
          <span class="muted">
            Learning {LANGUAGES[s.targetLang]} · level {s.level}
          </span>
        </div>
      </header>

      {!s.setupDone && (
        <button class="primary setup" onClick={() => openPage('/welcome.html')}>
          ✨ Finish setting up (5 min)
        </button>
      )}

      <Toggle checked={s.overlayEnabled} onChange={(v) => update({ overlayEnabled: v })}>
        Captions on videos
      </Toggle>

      <div class="stack" style={{ gap: '6px' }}>
        <span class="field-label">Mode</span>
        <div class="modes" role="radiogroup" aria-label="Mode">
          {PLAYBACK_PRESETS.map((p) => (
            <button
              key={p}
              role="radio"
              aria-checked={s.playbackPreset === p}
              aria-pressed={s.playbackPreset === p}
              title={PRESET_INFO[p].desc}
              onClick={() => update({ playbackPreset: p })}
            >
              <span aria-hidden="true">{PRESET_INFO[p].emoji}</span> {PRESET_INFO[p].label}
            </button>
          ))}
        </div>
        <p class="muted mode-desc">{PRESET_INFO[s.playbackPreset].desc}</p>
      </div>

      {isYouTube(tabUrl) ? (
        <p class="muted">▶ Running on YouTube automatically.</p>
      ) : (
        <button onClick={() => void showOnPage()}>Show captions on this page</button>
      )}
      {message && <p class="muted">{message}</p>}

      <footer class="popup-foot">
        <button class="btn-ghost" onClick={() => openPage('/review.html')}>
          ⭐ Saved words
        </button>
        <button class="btn-ghost" onClick={() => void browser.runtime.openOptionsPage()}>
          ⚙️ Settings
        </button>
      </footer>
    </main>
  );
}

render(<Popup />, document.getElementById('app') as HTMLElement);
