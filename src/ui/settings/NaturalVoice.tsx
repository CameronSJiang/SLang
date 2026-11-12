import { useEffect, useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
import { KOKORO_SPEED_RANGE, type Settings } from '@/src/core/settings';
import { ttsLoad, ttsSpeak, ttsStatus } from '@/src/tts/client';
import { fromBase64, type TtsProgressEvent, type TtsStatus } from '@/src/tts/messages';
import { KOKORO_DOWNLOAD_MB, KOKORO_VOICES } from '@/src/tts/voices';
import { Segmented } from './kit';

const SAMPLE = '¡Hola! Hoy vamos a aprender algo nuevo. ¿Estás listo? ¡Vamos!';

/** Kokoro voice picker, download, and sample. */
export function NaturalVoice({ s, update }: { s: Settings; update(p: Partial<Settings>): void }) {
  const [status, setStatus] = useState<TtsStatus | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void ttsStatus().then(setStatus, () => setStatus({ loaded: false, loading: false }));
    const on = (m: unknown) => {
      const e = m as TtsProgressEvent | undefined;
      if (e?.type === 'slang-tts-progress') setProgress(e.fraction);
    };
    browser.runtime.onMessage.addListener(on);
    return () => browser.runtime.onMessage.removeListener(on);
  }, []);

  const voices = KOKORO_VOICES.es;

  const hear = async () => {
    setBusy(true);
    setNote('');
    try {
      if (!status?.loaded) setStatus(await ttsLoad());
      const t0 = performance.now();
      const clip = await ttsSpeak(SAMPLE, s.kokoroVoice, s.kokoroSpeed);
      const took = (performance.now() - t0) / 1000;
      const url = URL.createObjectURL(new Blob([fromBase64(clip.wav)], { type: 'audio/wav' }));
      await new Audio(url).play();
      setNote(
        `Made ${clip.seconds.toFixed(1)}s of speech in ${took.toFixed(1)}s ${
          took < clip.seconds
            ? '— fast enough to keep up. 🎉'
            : '— a bit slow on this computer; SLang will pause briefly to catch up.'
        }`,
      );
      if (s.dubEngine !== 'natural') update({ dubEngine: 'natural' });
    } catch (e) {
      setNote(`Couldn’t play it: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <div class="stack">
      <Segmented
        label="Natural voice"
        value={s.kokoroVoice}
        options={voices.map((v) => ({ value: v.id, label: v.name, title: v.desc }))}
        onChange={(v) => update({ kokoroVoice: v })}
      />
      <label class="field-label" for="kspeed">
        Energy · {s.kokoroSpeed <= 0.95 ? 'calm' : s.kokoroSpeed >= 1.15 ? 'hyped' : 'lively'} (
        {s.kokoroSpeed.toFixed(2)}×)
      </label>
      <input
        id="kspeed"
        type="range"
        min={KOKORO_SPEED_RANGE[0]}
        max={KOKORO_SPEED_RANGE[1]}
        step={0.05}
        value={s.kokoroSpeed}
        onChange={(e) => update({ kokoroSpeed: Number(e.currentTarget.value) })}
      />
      <div class="row">
        <button class="primary" disabled={busy} onClick={() => void hear()}>
          {status?.loaded ? '▶ Hear it' : `⬇ Download & hear it (~${KOKORO_DOWNLOAD_MB} MB, once)`}
        </button>
        <span class={`chip ${status?.loaded ? 'ok' : 'wait'}`}>
          {status?.loaded
            ? '✓ Downloaded'
            : progress !== null
              ? `Downloading… ${Math.round(progress * 100)}%`
              : busy
                ? 'Starting…'
                : 'Not downloaded yet'}
        </span>
      </div>
      {note && <p class="muted">{note}</p>}
      <p class="muted">
        Runs entirely on your computer — free, and nothing you watch is sent anywhere. The voice
        files download once from Hugging Face.
      </p>
    </div>
  );
}
