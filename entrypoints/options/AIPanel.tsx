import { useEffect, useState } from 'preact/hooks';
import { LANGUAGES, type Settings } from '@/src/core/settings';
import { AnthropicProvider } from '@/src/llm/anthropic';
import {
  chromeAIStatus,
  ChromeAIProvider,
  setupChromeAI,
  type ChromeAIStatus,
} from '@/src/llm/chromeAI';
import type { LLMProvider } from '@/src/llm/types';

const SAMPLES: Record<string, string> = {
  es: '¿Qué tal? Hoy vamos a la playa con mis amigos para nadar y tomar el sol.',
  fr: 'Salut ! Aujourd’hui on va à la plage avec mes amis.',
  ja: 'こんにちは。今日は友達と海に行きます。',
  ko: '안녕하세요. 오늘은 친구들과 바다에 가요.',
  en: 'Hi! Today we are going to the beach with my friends.',
};

const STATUS_TEXT: Record<ChromeAIStatus['prompt'], string> = {
  available: 'Ready',
  downloadable: 'Needs a one-time download',
  downloading: 'Downloading…',
  unavailable: 'Not supported for this language or device',
  missing: 'Not available in this Chrome (update Chrome, or it may not support built-in AI)',
};

async function runTest(p: LLMProvider, s: Settings): Promise<string> {
  const text = SAMPLES[s.targetLang] ?? SAMPLES.es ?? '';
  const t0 = performance.now();
  const [cue] = await p.annotate([{ id: 't', start: 0, end: 1, text }], {
    lang: s.targetLang,
    nativeLang: s.nativeLang,
    context: [],
    // Same as on videos: slow on-device models skip very common words.
    ...(p.commonCutoff ? { commonCutoff: p.commonCutoff } : {}),
  });
  const secs = ((performance.now() - t0) / 1000).toFixed(1);
  const glossed = cue?.tokens.filter((t) => t.gloss) ?? [];
  const words = glossed.map((t) => `${t.surface} = ${t.gloss}`).join(', ');
  const common = (cue?.tokens.length ?? 0) - glossed.length;
  return `OK in ${secs}s. ${words || 'no word meanings'}${common ? ` (${common} common words skipped)` : ''}${cue?.l1 ? ` → “${cue.l1}”` : ''}`;
}

export function AIPanel({ s }: { s: Settings }) {
  const [chrome, setChrome] = useState<ChromeAIStatus | null>(null);
  const [download, setDownload] = useState('');
  const [chromeResult, setChromeResult] = useState('');
  const [keyResult, setKeyResult] = useState('');

  const refresh = () => void chromeAIStatus(s.targetLang, s.nativeLang).then(setChrome);
  useEffect(refresh, [s.targetLang, s.nativeLang]);

  const startDownload = async () => {
    setDownload('Starting…');
    try {
      await setupChromeAI(s.targetLang, s.nativeLang, (what, loaded) =>
        setDownload(
          `${{ prompt: 'AI model', translator: 'Translator', dubTranslator: 'Dub translator' }[what]}: ${Math.round(loaded * 100)}%`,
        ),
      );
      setDownload('Done');
    } catch (e) {
      setDownload(`Download failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    refresh();
  };

  const test = async (p: LLMProvider, set: (m: string) => void) => {
    set('Testing…');
    try {
      set(await runTest(p, s));
    } catch (e) {
      set(`Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const needsDownload =
    chrome &&
    (['downloadable', 'downloading'] as const).some(
      (a) => a === chrome.prompt || a === chrome.translator || a === chrome.dubTranslator,
    );

  return (
    <>
      <span class="label">Chrome built-in AI (free, on-device)</span>
      {chrome ? (
        <p class="muted">
          Word meanings: {STATUS_TEXT[chrome.prompt]}
          <br />
          Line translation: {STATUS_TEXT[chrome.translator]}
          <br />
          Dub translation ({LANGUAGES[s.nativeLang]} → {LANGUAGES[s.targetLang]}):{' '}
          {STATUS_TEXT[chrome.dubTranslator]}
        </p>
      ) : (
        <p class="muted">Checking…</p>
      )}
      <div class="row">
        {needsDownload && <button onClick={() => void startDownload()}>Download</button>}
        <button
          disabled={chrome?.prompt !== 'available'}
          onClick={() => void test(new ChromeAIProvider(), setChromeResult)}
        >
          Test
        </button>
        <button onClick={refresh}>Recheck</button>
      </div>
      {download && <p class="muted">{download}</p>}
      {chromeResult && <p class="muted">{chromeResult}</p>}

      <div class="row">
        <button
          disabled={!s.anthropicApiKey}
          onClick={() => void test(new AnthropicProvider(s.anthropicApiKey), setKeyResult)}
        >
          Test Anthropic key
        </button>
      </div>
      {keyResult && <p class="muted">{keyResult}</p>}
    </>
  );
}
