import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import {
  GLOSS_DENSITIES,
  LANGUAGES,
  LEVELS,
  type LangCode,
  type LLMProviderId,
  type Settings,
} from '@/src/core/settings';
import { loadSettings, saveSettings } from '@/src/storage/settings';
import './style.css';

const PROVIDER_LABELS: Record<LLMProviderId, string> = {
  'chrome-ai': 'Chrome built-in AI',
  anthropic: 'Anthropic (your API key)',
  null: 'None (no glosses)',
};

const DENSITY_LABELS = { auto: 'Auto', low: 'Low', med: 'Medium', high: 'High' } as const;

function Options() {
  const [s, setS] = useState<Settings | null>(null);
  const [status, setStatus] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    void loadSettings().then(setS);
  }, []);

  if (!s) return <p>Loading…</p>;

  const update = async (patch: Partial<Settings>) => {
    setS(await saveSettings(patch));
    setStatus('Saved');
    setTimeout(() => setStatus(''), 1200);
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
  const toggle = (p: LLMProviderId, on: boolean) =>
    void update({ providers: on ? [...movable, p] : movable.filter((x) => x !== p) });

  const keyProps = {
    id: 'apiKey',
    autocomplete: 'off',
    spellcheck: false,
    placeholder: 'sk-ant-…',
    value: s.anthropicApiKey,
    onChange: (e: Event) =>
      void update({ anthropicApiKey: (e.currentTarget as HTMLInputElement).value }),
  };

  const langSelect = (field: 'targetLang' | 'nativeLang') => (
    <select
      id={field}
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
      <h1>SLang settings</h1>

      <section>
        <label for="targetLang">Language I'm learning</label>
        {langSelect('targetLang')}
        <label for="nativeLang">My native language</label>
        {langSelect('nativeLang')}
        {s.targetLang === s.nativeLang && (
          <p class="warn">Target and native language are the same.</p>
        )}
      </section>

      <section>
        <label for="level">My level</label>
        <select
          id="level"
          value={s.level}
          onChange={(e) => void update({ level: e.currentTarget.value as Settings['level'] })}
        >
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>

        <span class="label">Gloss density</span>
        <div class="row" role="radiogroup" aria-label="Gloss density">
          {GLOSS_DENSITIES.map((d) => (
            <label key={d} class="inline">
              <input
                type="radio"
                name="density"
                checked={s.glossDensity === d}
                onChange={() => void update({ glossDensity: d })}
              />
              {DENSITY_LABELS[d]}
            </label>
          ))}
        </div>
      </section>

      <section>
        <span class="label">AI providers (tried in this order)</span>
        <ol class="providers">
          {movable.map((p, i) => (
            <li key={p}>
              <input type="checkbox" checked onChange={() => toggle(p, false)} />
              {PROVIDER_LABELS[p]}
              <button disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                ↑
              </button>
              <button
                disabled={i === movable.length - 1}
                onClick={() => move(i, 1)}
                aria-label="Move down"
              >
                ↓
              </button>
            </li>
          ))}
          <li class="muted">{PROVIDER_LABELS.null} — always the fallback</li>
        </ol>
        {(['chrome-ai', 'anthropic'] as const)
          .filter((p) => !movable.includes(p))
          .map((p) => (
            <label key={p} class="inline">
              <input type="checkbox" onChange={() => toggle(p, true)} />
              Enable {PROVIDER_LABELS[p]}
            </label>
          ))}

        <label for="apiKey">Anthropic API key</label>
        <div class="row">
          {showKey ? <input type="text" {...keyProps} /> : <input type="password" {...keyProps} />}
          <button onClick={() => setShowKey(!showKey)}>{showKey ? 'Hide' : 'Show'}</button>
        </div>
        <p class="muted">Stored only on this device. Never synced or logged.</p>
      </section>

      <p class="status" role="status">
        {status}
      </p>
    </main>
  );
}

render(<Options />, document.getElementById('app') as HTMLElement);
