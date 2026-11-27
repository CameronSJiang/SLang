/**
 * Everything you're likely to tweak: timing (seconds), files, words, colours.
 */
export const FPS = 60;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION_S = 23.5;
export const f = (seconds: number) => Math.round(seconds * FPS);

/** Files in video/public/. `trimStart` skips seconds at the start of a clip. */
export const FILES = {
  englishSource: { file: 'english_source.mp4', trimStart: 0 },
  spanishDubbed: { file: 'spanish_dubbed.mp4', trimStart: 0 },
  spanishSource: { file: 'spanish_source.mp4', trimStart: 0 },
  englishCaptioned: { file: 'english_captioned.mp4', trimStart: 0 },
  music: { file: 'bg_music.mp3', trimStart: 0 },
} as const;
export type ClipKey = Exclude<keyof typeof FILES, 'music'>;

export const CITIES = {
  newYork: { name: 'New York', country: 'USA', lat: 40.71, lng: -74.01 },
  madrid: { name: 'Madrid', country: 'Spain', lat: 40.42, lng: -3.7 },
} as const;

/**
 * The timeline. Each scene shows one clip; between them the clip collapses into a dot,
 * flies across the globe, and the destination dot expands into the next clip.
 */
export const T = {
  // Part 1: English → Spanish dubbing
  englishIn: 0,
  collapse1: 4.0, // English card shrinks to a dot on New York
  flight1: 4.6, // dot leaves New York
  land1: 7.0, // pings Madrid
  expand1: 7.3, // Madrid dot grows into the dubbed clip
  dubbedPlay: 7.5,
  // Part 2: Spanish → English captions
  whip: 11.5, // whip-pan to the Spanish source
  collapse2: 15.0,
  flight2: 15.6,
  land2: 18.0,
  expand2: 18.3,
  captionedPlay: 18.5,
  // Close
  endCard: 22.0,
  end: 23.5,
} as const;

/** The two flights and the label that morphs on each. */
export const FLIGHTS = [
  { from: CITIES.newYork, to: CITIES.madrid, start: T.flight1, land: T.land1, label: ['ENGLISH', 'ESPAÑOL'] },
  { from: CITIES.madrid, to: CITIES.newYork, start: T.flight2, land: T.land2, label: ['ESPAÑOL', 'ENGLISH'] },
] as const;

/**
 * Background music volume: low under speech, up during the globe flights and end card,
 * fading out at the very end. Each [seconds, volume] pair is a keyframe; values in
 * between are smoothly interpolated.
 */
export const MUSIC = {
  speech: 0.14,
  flight: 0.55,
  ramp: 0.35, // seconds to move between levels
} as const;

export const COPY = {
  badges: {
    englishSource: 'INPUT // ENGLISH',
    spanishDubbed: 'DUBBED // ESPAÑOL',
    spanishSource: 'INPUT // ESPAÑOL',
    englishCaptioned: 'CAPTIONS // ENGLISH',
  } satisfies Record<ClipKey, string>,
  hud1: 'MODE // AI DUBBING',
  hud2: 'MODE // INSTANT TRANSLATED CAPTIONS',
  brand: 'SLANG',
  tagline: 'DUBBED OR CAPTIONED. YOU CHOOSE.',
  url: 'golden-khapse-cd903e.netlify.app',
} as const;

export const COLORS = {
  bg: '#09090B',
  surface: '#111113',
  border: 'rgba(255,255,255,0.1)',
  line: 'rgba(255,255,255,0.08)',
  lineStrong: 'rgba(255,255,255,0.16)',
  text: '#FAFAFA',
  muted: '#A1A1AA',
  dim: '#71717A',
  accent: '#F2A93B',
  cobalt: '#3B6EF5',
} as const;
