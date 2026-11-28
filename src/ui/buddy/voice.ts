/**
 * Say one word or short line with start/end callbacks (so Draco's mouth can
 * move): the on-device Kokoro voice when it's chosen and already loaded,
 * otherwise the browser's voice.
 */
import { fromBase64 } from '../../tts/messages';
import { ttsSpeak, ttsStatus } from '../../tts/client';
import { kokoroSupports } from '../../tts/voices';
import { speak } from '../tts';

export interface SayOptions {
  lang: string;
  /** Kokoro voice to prefer (only used if the model is already downloaded). */
  natural?: { voice: string; speed: number; gpu?: boolean } | null;
  onStart?(): void;
  onEnd?(): void;
}

export interface SayHandle {
  stop(): void;
}

/** If no speech events arrive (no voice installed), still end after this long. */
const SAFETY_MS = 6000;
/** Pretend-talk time when nothing can speak at all. */
const SILENT_MS = 900;

export function sayWord(text: string, o: SayOptions): SayHandle {
  let done = false;
  let audio: HTMLAudioElement | null = null;
  let url = '';
  const timers: ReturnType<typeof setTimeout>[] = [];
  const end = () => {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    if (url) URL.revokeObjectURL(url);
    o.onEnd?.();
  };
  const system = () => {
    if (done) return;
    const ok = speak(text, o.lang, undefined, { onStart: () => o.onStart?.(), onEnd: end });
    if (!ok) {
      o.onStart?.();
      timers.push(setTimeout(end, SILENT_MS));
    } else {
      timers.push(setTimeout(end, SAFETY_MS));
    }
  };

  void (async () => {
    if (o.natural && kokoroSupports(o.lang)) {
      try {
        if ((await ttsStatus()).loaded) {
          const clip = await ttsSpeak(text, o.natural.voice, o.natural.speed, o.natural.gpu);
          if (done) return;
          url = URL.createObjectURL(new Blob([fromBase64(clip.wav)], { type: 'audio/wav' }));
          audio = new Audio(url);
          audio.onplaying = () => o.onStart?.();
          audio.onended = end;
          audio.onerror = end;
          await audio.play();
          timers.push(setTimeout(end, Math.max(SAFETY_MS, clip.seconds * 1000 + 1000)));
          return;
        }
      } catch {
        // fall through to the browser voice
      }
    }
    system();
  })();

  return {
    stop: () => {
      audio?.pause();
      globalThis.speechSynthesis?.cancel();
      end();
    },
  };
}
