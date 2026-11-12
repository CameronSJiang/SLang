import { useEffect, useState } from 'preact/hooks';
import {
  buildPlacement,
  scorePlacement,
  seededRandom,
  supportsPlacement,
  type PlacementItem,
  type PlacementResult,
} from '@/src/core/placement';
import { LANGUAGES, type Settings } from '@/src/core/settings';
import { loadFreq } from '@/src/storage/freq';

interface Props {
  s: Settings;
  onDone(r: PlacementResult): void;
}

/** ~2-minute yes/no vocabulary check that sets the starting level. */
export function PlacementTest({ s, onDone }: Props) {
  const [items, setItems] = useState<PlacementItem[] | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [result, setResult] = useState<PlacementResult | null>(null);
  const [error, setError] = useState('');

  const answer = (yes: boolean) => {
    if (!items) return;
    const next = [...answers, yes];
    setAnswers(next);
    if (next.length === items.length) {
      const r = scorePlacement(items, next);
      setResult(r);
      setItems(null);
      onDone(r);
    }
  };

  useEffect(() => {
    if (!items) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'y' || e.key === 'ArrowLeft') answer(true);
      if (e.key === 'n' || e.key === 'ArrowRight') answer(false);
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  });

  if (!supportsPlacement(s.targetLang)) {
    return <p class="muted">The level test isn’t available for {LANGUAGES[s.targetLang]} yet.</p>;
  }

  const start = async () => {
    setError('');
    setResult(null);
    const freq = await loadFreq(s.targetLang);
    if (!freq) return setError('Could not load the word list.');
    setAnswers([]);
    setItems(buildPlacement(freq.words, s.targetLang, seededRandom(Date.now())));
  };

  if (items) {
    const item = items[answers.length];
    const pct = (answers.length / items.length) * 100;
    return (
      <div class="placement">
        <div class="progress" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
        <p class="muted">
          Do you know this word? Some are fake — say no to those, we’re watching 👀 (
          {answers.length + 1}/{items.length})
        </p>
        <p class="placement-word" lang={s.targetLang}>
          {item?.word}
        </p>
        <div class="row">
          <button class="primary" onClick={() => answer(true)}>
            Yes, I know it (Y)
          </button>
          <button onClick={() => answer(false)}>No (N)</button>
          <button class="btn-ghost" onClick={() => setItems(null)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="stack">
      <div class="row">
        <button class="primary" onClick={() => void start()}>
          Take the 2-minute level test
        </button>
      </div>
      {result && (
        <p class="muted">
          🎉 About {result.vocab.toLocaleString()} words — that’s level {result.level}. Saved.
          {result.falseAlarmRate > 0.3 &&
            ' (A few fake words fooled you, so we nudged the estimate down.)'}
        </p>
      )}
      {!result && s.vocabSize && (
        <p class="muted">Your last test: about {s.vocabSize.toLocaleString()} words.</p>
      )}
      {error && <p class="warn">{error}</p>}
    </div>
  );
}
