/** Dub timing and voice choice. Pure (no speechSynthesis here). */
import { langMatches } from './lang';

/** Typical TTS speed at rate 1.0, in characters per second (Spanish/French/English voices). */
export const BASE_CHARS_PER_SEC = 15;
export const MIN_RATE = 1.0;
export const MAX_RATE = 1.6;

/**
 * Speech rate so `text` fits in `seconds`. We only speed up (never slow a
 * line down to fill silence), capped at 1.6×; longer lines overrun and the
 * player waits for them.
 */
export function fitRate(text: string, seconds: number): number {
  const need = text.length / BASE_CHARS_PER_SEC;
  if (seconds <= 0) return MAX_RATE;
  return Math.min(MAX_RATE, Math.max(MIN_RATE, need / seconds));
}

export interface VoiceLike {
  voiceURI: string;
  name: string;
  lang: string;
  /** False for network voices (e.g. Chrome's "Google …"), which send text off-device. */
  localService: boolean;
}

/** Voices for `lang`, on-device first. */
export function voicesFor<V extends VoiceLike>(voices: readonly V[], lang: string): V[] {
  return voices
    .filter((v) => langMatches(v.lang.replace('_', '-'), lang))
    .sort(
      (a, b) => Number(b.localService) - Number(a.localService) || a.name.localeCompare(b.name),
    );
}

/** The chosen voice if it's still installed, else the best on-device voice for `lang`. */
export function pickVoice<V extends VoiceLike>(
  voices: readonly V[],
  lang: string,
  preferredURI: string | null,
): V | undefined {
  const candidates = voicesFor(voices, lang);
  return (
    candidates.find((v) => v.voiceURI === preferredURI) ?? candidates.find((v) => v.localService)
  );
}
