import { render, type ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
import { pickVoice } from '@/src/core/dub';
import { LANGUAGES, LEVELS, type LangCode, type Settings } from '@/src/core/settings';
import { chromeAIStatus, type ChromeAIStatus } from '@/src/llm/chromeAI';
import { loadSettings, saveSettings, watchSettings } from '@/src/storage/settings';
import { AIPanel } from '@/src/ui/settings/AIPanel';
import { DubPanel } from '@/src/ui/settings/DubPanel';
import { PlacementTest } from '@/src/ui/settings/PlacementTest';
import '@/src/ui/settings/page.css';
import './welcome.css';

/** Where to find a first video, per target language. */
const TRY_SEARCH: Record<string, string> = {
  es: 'dreaming spanish beginner',
  fr: 'french comprehensible input beginner',
  ja: 'comprehensible japanese beginner',
  ko: 'korean comprehensible input beginner',
  en: 'english comprehensible input beginner',
};

const youtubeSearch = (q: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

function Step(props: { n: number; title: string; done: boolean; children: ComponentChildren }) {
  return (
    <section class={`step${props.done ? ' done' : ''}`}>
      <h2>
        <span class="num">{props.done ? '✓' : props.n}</span>
        {props.title}
      </h2>
      {props.children}
    </section>
  );
}

function Welcome() {
  const [s, setS] = useState<Settings | null>(null);
  const [ai, setAi] = useState<ChromeAIStatus | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => speechSynthesis.getVoices());
  useEffect(() => {
    const on = () => setVoices(speechSynthesis.getVoices());
    speechSynthesis.addEventListener('voiceschanged', on);
    return () => speechSynthesis.removeEventListener('voiceschanged', on);
  }, []);

  useEffect(() => {
    void loadSettings().then(setS);
    return watchSettings(setS);
  }, []);
  useEffect(() => {
    if (!s) return;
    const check = () => void chromeAIStatus(s.targetLang, s.nativeLang).then(setAi);
    check();
    // Model downloads finish in the background; keep the checkmark honest.
    const t = setInterval(check, 5000);
    return () => clearInterval(t);
  }, [s?.targetLang, s?.nativeLang]);

  if (!s) return <p>Loading…</p>;
  const update = (patch: Partial<Settings>) => void saveSettings(patch).then(setS);
  const lang = LANGUAGES[s.targetLang];
  const hasVoice = s.dubVoice !== null || !!pickVoice(voices, s.targetLang, null);
  const aiReady =
    ai?.prompt === 'available' || ai?.translator === 'available' || !!s.anthropicApiKey;

  const langSelect = (field: 'targetLang' | 'nativeLang') => (
    <select
      value={s[field]}
      onChange={(e) => update({ [field]: e.currentTarget.value as LangCode })}
    >
      {Object.entries(LANGUAGES).map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  );

  return (
    <main class="welcome">
      <header>
        <img src="/icon/128.png" width="72" height="72" alt="" />
        <div>
          <h1>Welcome to SLang</h1>
          <p class="muted">
            Learn a language from the videos you already watch. Five quick steps, about five
            minutes.
          </p>
        </div>
      </header>

      <Step n={1} title="Your languages" done={s.targetLang !== s.nativeLang}>
        <div class="row">
          <span>I’m learning</span> {langSelect('targetLang')} <span>and I speak</span>{' '}
          {langSelect('nativeLang')}
        </div>
      </Step>

      <Step n={2} title="Turn on translations" done={aiReady}>
        <p>
          SLang uses AI to explain words and translate lines. Chrome’s built-in AI is free and runs
          on your computer. Click <b>Download</b> once (a few GB, it keeps going in the background)
          — or paste an Anthropic API key in Settings for more accurate meanings.
        </p>
        <AIPanel s={s} showAnthropic={false} />
      </Step>

      <Step n={3} title="Pick a voice for dubbing" done={hasVoice}>
        <p>
          Videos in {LANGUAGES[s.nativeLang]} can be dubbed into {lang} so you hear {lang} instead.
          Choose a voice and click <b>Test voice</b>.
        </p>
        <DubPanel s={s} update={update} />
      </Step>

      <Step n={4} title="Find your level (2 minutes)" done={s.vocabSize !== null}>
        <p>So SLang only explains the words you probably don’t know yet.</p>
        <PlacementTest s={s} onDone={(r) => update({ level: r.level, vocabSize: r.vocab })} />
        <p class="muted">
          Or just pick one:{' '}
          <select
            value={s.level}
            onChange={(e) =>
              update({ level: e.currentTarget.value as Settings['level'], vocabSize: null })
            }
          >
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </p>
      </Step>

      <Step n={5} title="Try it" done={s.setupDone}>
        <div class="row wrap">
          <a
            class="button"
            href={youtubeSearch(TRY_SEARCH[s.targetLang] ?? `${lang} for beginners`)}
            target="_blank"
          >
            Watch a {lang} video
          </a>
          <a
            class="button"
            href={youtubeSearch(`${LANGUAGES[s.nativeLang]} video`)}
            target="_blank"
          >
            Dub {/^[AEIOU]/.test(LANGUAGES[s.nativeLang]) ? 'an' : 'a'} {LANGUAGES[s.nativeLang]}{' '}
            video
          </a>
        </div>
        <ul class="tips">
          <li>
            <b>Hover</b> a caption to see the whole line in {LANGUAGES[s.nativeLang]}.
          </li>
          <li>
            <b>Click a word</b> to hear it and see what it means. <b>Save</b> it to review later.
          </li>
          <li>
            <b>Drag</b> the captions up or down. Switch modes (captions, dub, bilingual) from the
            SLang button in the toolbar.
          </li>
          <li>
            Pin SLang: click the puzzle piece next to the address bar, then the pin next to SLang.
          </li>
        </ul>
        <div class="row">
          <button class="primary" onClick={() => update({ setupDone: true })}>
            {s.setupDone ? 'All set ✓' : 'Finish setup'}
          </button>
          <button onClick={() => void browser.runtime.openOptionsPage()}>All settings</button>
        </div>
      </Step>
    </main>
  );
}

render(<Welcome />, document.getElementById('app') as HTMLElement);
