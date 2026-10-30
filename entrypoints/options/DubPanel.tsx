import { useEffect, useState } from 'preact/hooks';
import { voicesFor } from '@/src/core/dub';
import { PLAYBACK_PRESETS, type PlaybackPreset } from '@/src/core/playback';
import { LANGUAGES, type Settings } from '@/src/core/settings';
import { speak } from '@/src/ui/tts';
import { PRESET_LABELS } from '@/src/ui/presets';

const SAMPLE: Record<string, string> = {
  es: 'Hola, este vídeo ahora está doblado al español.',
  fr: 'Bonjour, cette vidéo est maintenant doublée en français.',
  ja: 'こんにちは。この動画は日本語に吹き替えられています。',
  ko: '안녕하세요. 이 영상은 한국어로 더빙되었습니다.',
  en: 'Hello, this video is now dubbed into English.',
};

function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => speechSynthesis.getVoices());
  useEffect(() => {
    const on = () => setVoices(speechSynthesis.getVoices());
    speechSynthesis.addEventListener('voiceschanged', on);
    return () => speechSynthesis.removeEventListener('voiceschanged', on);
  }, []);
  return voices;
}

export function DubPanel({ s, update }: { s: Settings; update(p: Partial<Settings>): void }) {
  const voices = voicesFor(useVoices(), s.targetLang);
  const chosen =
    voices.find((v) => v.voiceURI === s.dubVoice) ?? voices.find((v) => v.localService);

  return (
    <section>
      <label for="preset">What to play</label>
      <select
        id="preset"
        value={s.playbackPreset}
        onChange={(e) => update({ playbackPreset: e.currentTarget.value as PlaybackPreset })}
      >
        {PLAYBACK_PRESETS.map((p) => (
          <option key={p} value={p}>
            {PRESET_LABELS[p]}
          </option>
        ))}
      </select>
      <p class="muted">
        You can also switch this from the SLang toolbar button while a video plays.
      </p>

      <label for="voice">Dub voice ({LANGUAGES[s.targetLang]})</label>
      {voices.length ? (
        <div class="row">
          <select
            id="voice"
            value={chosen?.voiceURI ?? ''}
            onChange={(e) => update({ dubVoice: e.currentTarget.value || null })}
          >
            {!chosen && <option value="">Choose a voice…</option>}
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name}
                {v.localService ? '' : ' (online — sends lines to Google)'}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              chosen &&
              speak(SAMPLE[s.targetLang] ?? SAMPLE.es ?? '', s.targetLang, chosen.voiceURI)
            }
          >
            Test voice
          </button>
        </div>
      ) : (
        <p class="warn">
          No {LANGUAGES[s.targetLang]} voices found. On a Mac, add one in System Settings →
          Accessibility → Spoken Content → System voice → Manage Voices, then reload this page.
        </p>
      )}
      {chosen && !chosen.localService && (
        <p class="warn">This voice runs online: dubbed lines are sent to Google to be spoken.</p>
      )}
    </section>
  );
}
