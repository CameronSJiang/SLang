import { render, type ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
import { pickVoice } from '@/src/core/dub';
import { LANGUAGES, type LangCode, type Settings } from '@/src/core/settings';
import { chromeAIStatus, type ChromeAIStatus } from '@/src/llm/chromeAI';
import { loadSettings, saveSettings, watchSettings } from '@/src/storage/settings';
import { AIPanel } from '@/src/ui/settings/AIPanel';
import { DubPanel } from '@/src/ui/settings/DubPanel';
import { LevelPicker } from '@/src/ui/settings/kit';
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

const HELLO: Record<string, string> = {
  es: '¡Hola!',
  fr: 'Salut !',
  ja: 'こんにちは！',
  ko: '안녕하세요!',
  en: 'Hello!',
};

const youtubeSearch = (q: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

const article = (word: string) => (/^[AEIOU]/i.test(word) ? 'an' : 'a');

function Step(props: {
  n: number;
  emoji: string;
  title: string;
  blurb: ComponentChildren;
  done: boolean;
  children: ComponentChildren;
}) {
  return (
    <section class={`card step${props.done ? ' done' : ''}`}>
      <div class="card-head">
        <span class="emoji" aria-hidden="true">
          {props.done ? '✅' : props.emoji}
        </span>
        <div>
          <p class="step-n">Step {props.n}</p>
          <h2>{props.title}</h2>
          <p class="muted">{props.blurb}</p>
        </div>
      </div>
      {props.children}
    </section>
  );
}

function Welcome() {
  const [s, setS] = useState<Settings | null>(null);
  const [ai, setAi] = useState<ChromeAIStatus | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => speechSynthesis.getVoices());

  useEffect(() => {
    void loadSettings().then(setS);
    return watchSettings(setS);
  }, []);
  useEffect(() => {
    const on = () => setVoices(speechSynthesis.getVoices());
    speechSynthesis.addEventListener('voiceschanged', on);
    return () => speechSynthesis.removeEventListener('voiceschanged', on);
  }, []);
  useEffect(() => {
    if (!s) return;
    const check = () => void chromeAIStatus(s.targetLang, s.nativeLang).then(setAi);
    check();
    // Model downloads finish in the background; keep the checkmark honest.
    const t = setInterval(check, 5000);
    return () => clearInterval(t);
  }, [s?.targetLang, s?.nativeLang]);

  if (!s) return <main>Loading…</main>;
  const update = (patch: Partial<Settings>) => void saveSettings(patch).then(setS);
  const lang = LANGUAGES[s.targetLang];
  const native = LANGUAGES[s.nativeLang];
  const aiReady =
    ai?.prompt === 'available' || ai?.translator === 'available' || !!s.anthropicApiKey;
  const hasVoice = s.dubVoice !== null || !!pickVoice(voices, s.targetLang, null);
  const levelSet = s.vocabSize !== null;
  const done = [s.targetLang !== s.nativeLang, aiReady, hasVoice, levelSet, s.setupDone];
  const progress = done.filter(Boolean).length;

  const langSelect = (field: 'targetLang' | 'nativeLang', label: string) => (
    <select
      aria-label={label}
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
      <header class="hero">
        <img src="/icon/128.png" width="84" height="84" alt="" />
        <div>
          <p class="hello">{HELLO[s.targetLang] ?? 'Hello!'}</p>
          <h1>
            Let’s turn your YouTube habit into a <span class="grad-text">{lang} habit</span>.
          </h1>
          <p class="muted">Five quick steps. About five minutes. Zero textbooks.</p>
        </div>
      </header>
      <div class="meter" aria-label={`${progress} of 5 steps done`}>
        <span style={{ width: `${(progress / 5) * 100}%` }} />
      </div>
      <p class="muted meter-label">
        {progress === 5 ? '¡Listo! You’re all set.' : `${progress} of 5 done`}
      </p>

      <Step
        n={1}
        emoji="🌍"
        title="What are we learning?"
        blurb="Pick your target. You can change it any time."
        done={done[0] as boolean}
      >
        <div class="row">
          <span>I’m learning</span> {langSelect('targetLang', 'Language I’m learning')}
          <span>and I speak</span> {langSelect('nativeLang', 'My native language')}
        </div>
      </Step>

      <Step
        n={2}
        emoji="🧠"
        title="Give SLang a brain"
        blurb={
          <>
            Chrome has a free AI built in that runs on your computer, so nothing leaves it. Hit{' '}
            <b>Download</b> once — it’s a few GB and keeps going in the background while you do the
            other steps.
          </>
        }
        done={aiReady}
      >
        <AIPanel s={s} showAnthropic={false} />
      </Step>

      <Step
        n={3}
        emoji="🎙️"
        title="Cast your narrator"
        blurb={`SLang can dub ${native} videos into ${lang}, so your guilty-pleasure videos become listening practice. Pick a voice and give it a listen.`}
        done={hasVoice}
      >
        <DubPanel s={s} update={update} />
      </Step>

      <Step
        n={4}
        emoji="📈"
        title="How much do you know?"
        blurb="So SLang only explains the words you don’t. Take the quick test, or just pick the closest match."
        done={levelSet}
      >
        <PlacementTest s={s} onDone={(r) => update({ level: r.level, vocabSize: r.vocab })} />
        <div class="sub">
          <LevelPicker value={s.level} onChange={(level) => update({ level, vocabSize: null })} />
        </div>
      </Step>

      <Step
        n={5}
        emoji="🍿"
        title="Go watch something"
        blurb="Seriously, that’s the homework. A few things to try while you’re there:"
        done={s.setupDone}
      >
        <ul class="tips">
          <li>
            <b>Hover</b> the captions to peek at the whole line in {native}.
          </li>
          <li>
            <b>Click any word</b> to hear it and see what it means. Hit <b>Save</b> and it comes
            back later for review.
          </li>
          <li>
            <b>Drag</b> the captions out of the way. Switch between captions, dub and bilingual from
            the SLang button in your toolbar.
          </li>
          <li>
            <b>Pin SLang</b>: puzzle-piece icon next to the address bar → pin next to SLang.
          </li>
        </ul>
        <div class="row">
          <a
            class="btn btn-primary"
            href={youtubeSearch(TRY_SEARCH[s.targetLang] ?? `${lang} for beginners`)}
            target="_blank"
            onClick={() => update({ setupDone: true })}
          >
            ▶ Watch {article(lang)} {lang} video
          </a>
          <a
            class="btn"
            href={youtubeSearch(`${native} video`)}
            target="_blank"
            onClick={() => update({ setupDone: true })}
          >
            🎙️ Dub {article(native)} {native} video
          </a>
          <button class="btn-ghost" onClick={() => update({ setupDone: true })}>
            {s.setupDone ? 'All set ✓' : 'Finish setup'}
          </button>
          <button class="btn-ghost" onClick={() => void browser.runtime.openOptionsPage()}>
            All settings
          </button>
        </div>
      </Step>
    </main>
  );
}

render(<Welcome />, document.getElementById('app') as HTMLElement);
