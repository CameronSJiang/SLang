import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import {
  CAPTION_FONT_RANGE,
  CAPTION_POSITION_RANGE,
  GLOSS_DENSITIES,
  LANGUAGES,
  type GlossDensity,
  type LangCode,
  type LLMProviderId,
  type Settings,
} from '@/src/core/settings';
import { loadSettings, saveSettings } from '@/src/storage/settings';
import { AIPanel } from '@/src/ui/settings/AIPanel';
import { DubPanel } from '@/src/ui/settings/DubPanel';
import {
  ALT_KEY,
  Card,
  LevelPicker,
  PowerButton,
  Segmented,
  ThemePicker,
  Toggle,
} from '@/src/ui/settings/kit';
import { PlacementTest } from '@/src/ui/settings/PlacementTest';
import '@/src/ui/settings/page.css';

const PROVIDER_LABELS: Record<LLMProviderId, string> = {
  'chrome-ai': 'Chrome built-in AI',
  anthropic: 'Anthropic (your API key)',
  null: 'None (captions only)',
};

const DENSITY: Record<GlossDensity, { label: string; title: string }> = {
  auto: {
    label: 'Auto',
    title: 'Just enough: up to 2 hints per line, only for words you probably don’t know',
  },
  low: { label: 'Fewer', title: 'At most 1 hint per line' },
  med: { label: 'Some', title: 'Up to 2 hints per line' },
  high: { label: 'More', title: 'Up to 3 hints per line, including words you half-know' },
};

function Options() {
  const [s, setS] = useState<Settings | null>(null);
  const [toast, setToast] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    void loadSettings().then(setS);
  }, []);

  if (!s) return <main>Loading…</main>;

  const update = async (patch: Partial<Settings>) => {
    setS(await saveSettings(patch));
    setToast('Saved ✓');
    setTimeout(() => setToast(''), 1200);
  };

  // Null always stays last; only the real providers can be reordered.
  const movable = s.providers.filter((p) => p !== 'null');
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= movable.length) return;
    const next = [...movable];
    next.splice(j, 0, ...next.splice(i, 1));
    void update({ providers: next });
  };
  const toggleProvider = (p: LLMProviderId, on: boolean) =>
    void update({ providers: on ? [...movable, p] : movable.filter((x) => x !== p) });

  const keyProps = {
    'aria-label': 'Anthropic API key',
    autocomplete: 'off',
    spellcheck: false,
    placeholder: 'sk-ant-…',
    value: s.anthropicApiKey,
    onChange: (e: Event) =>
      void update({ anthropicApiKey: (e.currentTarget as HTMLInputElement).value }),
  };

  const langSelect = (field: 'targetLang' | 'nativeLang', label: string) => (
    <select
      aria-label={label}
      value={s[field]}
      onChange={(e) => void update({ [field]: e.currentTarget.value as LangCode })}
    >
      {Object.entries(LANGUAGES).map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  );

  return (
    <main>
      <header class="page-head">
        <img src="/icon/128.png" width="64" height="64" alt="" />
        <div style={{ flex: 1 }}>
          <h1>
            <span class="grad-text">SLang</span> settings
          </h1>
          <p class="muted">
            Tweak away — everything saves as you go. New here?{' '}
            <a href="/welcome.html">Run the setup guide</a>.
          </p>
        </div>
        <PowerButton on={s.enabled} onChange={(enabled) => void update({ enabled })} />
      </header>
      {!s.enabled && (
        <p class="card off-banner">
          <span>
            <b>SLang is off.</b> Videos play normally: no captions, no dubbing, no AI. Flip the
            power button (or press <kbd>{ALT_KEY}</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd>) to bring it
            back.
          </span>
        </p>
      )}

      <Card emoji="🌍" title="Languages">
        <div class="row">
          <span>I’m learning</span> {langSelect('targetLang', 'Language I’m learning')}
          <span>and I speak</span> {langSelect('nativeLang', 'My native language')}
        </div>
        {s.targetLang === s.nativeLang && (
          <p class="warn">Bold move, learning the language you already speak. Pick another one?</p>
        )}
      </Card>

      <Card
        emoji="📈"
        title="Your level"
        subtitle="SLang only explains the words you probably don’t know yet. Pick the closest match, or let the quick test figure it out."
      >
        <LevelPicker
          value={s.level}
          // Picking a level by hand replaces the test's estimate.
          onChange={(level) => void update({ level, vocabSize: null })}
        />
        <div class="sub">
          <PlacementTest
            s={s}
            onDone={(r) => void update({ level: r.level, vocabSize: r.vocab })}
          />
        </div>
      </Card>

      <Card emoji="💬" title="Captions" subtitle="How the words on the video look and behave.">
        <span class="field-label">Theme</span>
        <ThemePicker value={s.captionTheme} onChange={(t) => void update({ captionTheme: t })} />
        <div class="sub">
          <span class="field-label">Word hints</span>
          <Segmented
            label="Word hints"
            value={s.glossDensity}
            options={GLOSS_DENSITIES.map((d) => ({ value: d, ...DENSITY[d] }))}
            onChange={(d) => void update({ glossDensity: d })}
          />
          <p class="muted">{DENSITY[s.glossDensity].title}.</p>
        </div>
        <div class="sub">
          <label class="field-label" for="fontSize">
            Text size · {s.captionFontSize}px
          </label>
          <input
            id="fontSize"
            type="range"
            min={CAPTION_FONT_RANGE[0]}
            max={CAPTION_FONT_RANGE[1]}
            value={s.captionFontSize}
            onChange={(e) => void update({ captionFontSize: Number(e.currentTarget.value) })}
          />
          <label class="field-label" for="position">
            Height above the bottom · {Math.round(s.captionPosition)}%
          </label>
          <input
            id="position"
            type="range"
            min={CAPTION_POSITION_RANGE[0]}
            max={CAPTION_POSITION_RANGE[1]}
            value={s.captionPosition}
            onChange={(e) => void update({ captionPosition: Number(e.currentTarget.value) })}
          />
          <p class="muted">Or just drag the captions up and down on the video.</p>
        </div>
      </Card>

      <Card
        emoji="🎙️"
        title="Dubbing"
        subtitle="Turn videos in your own language into listening practice."
      >
        <DubPanel s={s} update={(p) => void update(p)} />
      </Card>

      <Card
        emoji="🧠"
        title="AI"
        subtitle="Explains words and translates lines. Tried in this order; captions still work with none."
      >
        <ol class="stack providers" style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
          {movable.map((p, i) => (
            <li key={p} class="row">
              <Toggle checked onChange={() => toggleProvider(p, false)}>
                <b>
                  {i + 1}. {PROVIDER_LABELS[p]}
                </b>
              </Toggle>
              <span style={{ flex: 1 }} />
              <button
                class="btn-ghost"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                class="btn-ghost"
                disabled={i === movable.length - 1}
                onClick={() => move(i, 1)}
                aria-label="Move down"
              >
                ↓
              </button>
            </li>
          ))}
          {(['chrome-ai', 'anthropic'] as const)
            .filter((p) => !movable.includes(p))
            .map((p) => (
              <li key={p}>
                <Toggle checked={false} onChange={() => toggleProvider(p, true)}>
                  {PROVIDER_LABELS[p]} (off)
                </Toggle>
              </li>
            ))}
        </ol>
        <div class="sub">
          <span class="field-label">Chrome built-in AI · free, stays on your computer</span>
          <AIPanel s={s} showAnthropic={false} />
        </div>
        <div class="sub">
          <span class="field-label">Anthropic API key · optional, more accurate</span>
          <div class="row">
            {showKey ? (
              <input type="text" {...keyProps} />
            ) : (
              <input type="password" {...keyProps} />
            )}
            <button class="btn-ghost" onClick={() => setShowKey(!showKey)}>
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p class="muted">Stored only on this device. Never synced, never logged.</p>
          <AIPanelKeyTest s={s} />
        </div>
      </Card>

      {toast && (
        <div class="toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}

/** Just the Anthropic key test, under the key field. */
function AIPanelKeyTest({ s }: { s: Settings }) {
  return <AIPanel s={s} only="anthropic" />;
}

render(<Options />, document.getElementById('app') as HTMLElement);
