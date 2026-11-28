import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
import { PLAYBACK_PRESETS } from '@/src/core/playback';
import { LANGUAGES, type Settings } from '@/src/core/settings';
import { Icon } from '@/src/ui/icons';
import { PRESET_INFO } from '@/src/ui/presets';
import { PowerButton } from '@/src/ui/settings/kit';
import { loadSettings, saveSettings } from '@/src/storage/settings';
import { WAITLIST_URL } from '@/src/ui/links';
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
        setMessage('No video on this page.');
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
        <div class="grow">
          <b>SLang</b>
          <span class="muted">
            {s.enabled
              ? `Learning ${LANGUAGES[s.targetLang]} · level ${s.level}`
              : 'Off · videos play normally'}
          </span>
        </div>
        <PowerButton on={s.enabled} onChange={(enabled) => update({ enabled })} />
      </header>

      {!s.setupDone && (
        <button class="setup" onClick={() => openPage('/welcome.html')}>
          <Icon name="sparkles" size={14} />
          Finish setting up
          <span class="mono setup-time">5 min</span>
        </button>
      )}

      {!s.enabled && (
        <p class="off-note">
          SLang is off. Videos play normally: no captions, no dubbing, no AI. Turn it back on with
          the power button.
        </p>
      )}

      {s.enabled && (
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
                <Icon name={PRESET_INFO[p].icon} size={15} />
                {PRESET_INFO[p].label}
              </button>
            ))}
          </div>
          <p class="muted mode-desc">{PRESET_INFO[s.playbackPreset].desc}</p>
        </div>
      )}

      {s.enabled &&
        (isYouTube(tabUrl) ? (
          <p class="status-line">
            <span class="live-dot" aria-hidden="true" />
            Running on YouTube automatically
          </p>
        ) : (
          <button class="primary cta" onClick={() => void showOnPage()}>
            <Icon name="captions" size={15} />
            Show captions on this page
          </button>
        ))}
      {s.enabled && message && <p class="muted">{message}</p>}

      {WAITLIST_URL && (
        <a class="muted waitlist" href={WAITLIST_URL} target="_blank" rel="noreferrer">
          SLang Pro is coming. Join the waitlist
          <Icon name="external-link" size={12} />
        </a>
      )}

      <footer class="popup-foot">
        <button class="foot-link" onClick={() => openPage('/review.html')}>
          <Icon name="bookmark" size={15} />
          Quiz & saved words
        </button>
        <button class="foot-link" onClick={() => void browser.runtime.openOptionsPage()}>
          <Icon name="settings" size={15} />
          Settings
        </button>
      </footer>
    </main>
  );
}

render(<Popup />, document.getElementById('app') as HTMLElement);
