/** Speak a word with a voice for its language, if the browser has one. */
export function speak(text: string, lang: string, voiceURI?: string): void {
  const synth = globalThis.speechSynthesis;
  if (!synth) return;
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
  synth.cancel();
  synth.speak(u);
}
