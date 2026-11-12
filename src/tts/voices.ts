/** Kokoro voice catalog (kept separate from kokoro.ts so pages/content scripts don't bundle the model runtime). */

export const KOKORO_VOICES = {
  es: [
    { id: 'ef_dora', name: 'Dora', desc: 'Warm and upbeat' },
    { id: 'em_alex', name: 'Alex', desc: 'Clear and friendly' },
    { id: 'em_santa', name: 'Santa', desc: 'Deep and jolly' },
  ],
} as const;

export const kokoroSupports = (lang: string): boolean =>
  (lang.split('-')[0] ?? lang) in KOKORO_VOICES;

/** Rough download size, for the UI. */
export const KOKORO_DOWNLOAD_MB = 90;
