export interface SpeakEvents {
  onStart?(): void;
  onEnd?(): void;
}

/**
 * Speak a word with a voice for its language, if the browser has one.
 * Returns false when there's no speech engine at all.
 */
export function speak(text: string, lang: string, voiceURI?: string, on?: SpeakEvents): boolean {
  const synth = globalThis.speechSynthesis;
  if (!synth) return false;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  const base = lang.split('-')[0]?.toLowerCase() ?? lang;
  const voices = synth.getVoices();
  const voice =
    voices.find((v) => v.voiceURI === voiceURI) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(base) && v.localService) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(base));
  if (voice) u.voice = voice;
  u.rate = 0.9;
  if (on?.onStart) u.onstart = () => on.onStart?.();
  if (on?.onEnd) {
    u.onend = () => on.onEnd?.();
    u.onerror = () => on.onEnd?.();
  }
  synth.cancel();
  synth.speak(u);
  return true;
}
