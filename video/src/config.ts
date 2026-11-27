/**
 * Everything you're likely to tweak lives here: timing, words, captions, brand.
 * Times are in seconds; FPS converts them to frames.
 */
export const FPS = 60;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION_S = 17.5;
export const f = (seconds: number) => Math.round(seconds * FPS);

export const TIMELINE = {
  // Act 1: the original English clip
  englishStart: 0,
  tiltStart: 4.0, // card scales down and tilts back
  // Act 2: the globe
  globeIn: 3.9, // globe starts fading in behind the tilting card
  phraseDetach: 4.1, // the phrase lifts off the waveform
  arcStart: 4.9, // trajectory starts drawing from the origin city
  arcLand: 7.9, // phrase locks in, destination pulses (chime)
  hudIn: 8.0,
  // Act 3: the dubbed clip
  dubZoom: 9.0, // camera dives toward the destination city
  dubStart: 9.5, // dubbed clip starts playing
  // Act 4: end card
  endCard: 15.0,
} as const;

/** The two clips you drop into public/. Seconds to skip at the start of each. */
export const CLIPS = {
  english: { file: 'english_clip.mp4', trimStart: 0 },
  dubbed: { file: 'dubbed_clip.mp4', trimStart: 0 },
} as const;

/** The phrase that flies across the globe and morphs mid-flight. */
export const PHRASE = { from: "What's going on", to: 'Qué pasa' } as const;

export const ROUTE = {
  from: { name: 'New York', lat: 40.71, lng: -74.01, code: 'EN-US' },
  to: { name: 'Madrid', lat: 40.42, lng: -3.7, code: 'ES-ES' },
} as const;

/**
 * Captions. Replace the words and times with what's actually said in each clip
 * (times are seconds from the start of that clip, after trimStart).
 * The dubbed clip already shows SLang's captions on screen; set `show: false` if
 * these feel like too much.
 */
export const CAPTIONS = {
  english: {
    show: true,
    words: [
      { t: 0.2, w: "What's" },
      { t: 0.45, w: 'going' },
      { t: 0.7, w: 'on,' },
      { t: 1.1, w: 'everybody?' },
      { t: 2.0, w: 'Today' },
      { t: 2.3, w: "we're" },
      { t: 2.55, w: 'going' },
      { t: 2.75, w: 'to' },
      { t: 2.9, w: 'the' },
      { t: 3.05, w: 'beach.' },
    ],
  },
  dubbed: {
    show: true,
    words: [
      { t: 0.2, w: '¿Qué' },
      { t: 0.45, w: 'pasa,' },
      { t: 0.8, w: 'a' },
      { t: 0.95, w: 'todos?' },
      { t: 1.9, w: 'Hoy' },
      { t: 2.2, w: 'vamos' },
      { t: 2.5, w: 'a' },
      { t: 2.65, w: 'la' },
      { t: 2.8, w: 'playa.' },
    ],
  },
} as const;

export const COPY = {
  sourceBadge: 'SOURCE // EN-US',
  dubBadge: 'DUBBED // ES-ES • NATURAL VOICE',
  hudTag: 'VOICE + CAPTIONS + WORD HINTS',
  hudHeadline: 'Now in Español.',
  brand: 'SLang',
  valueProp: 'Watch in English. Learn in Spanish.',
  url: 'golden-khapse-cd903e.netlify.app',
} as const;

export const COLORS = {
  bg: '#09090B',
  surface: '#111113',
  line: 'rgba(255,255,255,0.08)',
  lineStrong: 'rgba(255,255,255,0.16)',
  text: '#FAFAFA',
  muted: '#A1A1AA',
  dim: '#71717A',
  accent: '#F2A93B',
  cobalt: '#3B6EF5',
} as const;
