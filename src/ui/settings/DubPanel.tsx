import { useEffect, useState } from 'preact/hooks';
import { voicesFor } from '@/src/core/dub';
import { PLAYBACK_PRESETS } from '@/src/core/playback';
import { LANGUAGES, type Settings } from '@/src/core/settings';
import { speak } from '@/src/ui/tts';
import { PRESET_INFO } from '@/src/ui/presets';

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
    <div class="stack">
      <span class="field-label">What to play</span>
      <div class="choices">
        {PLAYBACK_PRESETS.map((p) => (
          <button
            key={p}
            class="choice"
            role="radio"
            aria-checked={s.playbackPreset === p}
            aria-pressed={s.playbackPreset === p}
            onClick={() => update({ playbackPreset: p })}
          >
            <span class="tag" aria-hidden="true">
              {PRESET_INFO[p].emoji}
            </span>
            <span>
              <b>{PRESET_INFO[p].label}</b>
              <span class="desc">{PRESET_INFO[p].desc}</span>
            </span>
          </button>
        ))}
      </div>
      <p class="muted">Switch any time from the SLang button in your toolbar.</p>

      <div class="sub">
        <span class="field-label">Dub voice ({LANGUAGES[s.targetLang]})</span>
        {voices.length ? (
          <div class="row">
            <select
              aria-label="Dub voice"
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
              ▶ Hear it
            </button>
          </div>
        ) : (
          <p class="warn">
            No {LANGUAGES[s.targetLang]} voices yet. On a Mac: System Settings → Accessibility →
            Spoken Content → System voice → Manage Voices… → {LANGUAGES[s.targetLang]}. Then reload
            this page.
          </p>
        )}
        {chosen && !chosen.localService && (
          <p class="warn">This voice runs online: dubbed lines are sent to Google to be spoken.</p>
        )}
        <p class="muted">
          Tip: Mac “Enhanced” and “Premium” voices sound far less robotic. Grab one in Manage
          Voices.
        </p>
      </div>
    </div>
  );
}
