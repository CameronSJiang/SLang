/** Playback modes: what the learner hears and which captions show (SPEC M2.5). Pure. */
import { langMatches } from './lang';

export const PLAYBACK_PRESETS = ['auto', 'captions', 'dub', 'dub+captions', 'bilingual'] as const;
export type PlaybackPreset = (typeof PLAYBACK_PRESETS)[number];

export type AudioMode = 'original' | 'dub';
export type CaptionMode = 'off' | 'l2' | 'l2+source';

export interface Playback {
  audio: AudioMode;
  captions: CaptionMode;
  /** Why we couldn't do what the preset asked, if so. */
  fallback?: 'already-target' | 'nothing-to-dub';
}

export interface VideoLanguages {
  targetLang: string;
  /** Language people speak in the video (from the auto-generated track), if known. */
  spokenLang: string | null;
  /** The video has a caption track in the target language. */
  hasTarget: boolean;
  /** We captured captions in some other language that could be translated. */
  hasSource: boolean;
}

const PRESET_MODES: Record<Exclude<PlaybackPreset, 'auto'>, Omit<Playback, 'fallback'>> = {
  captions: { audio: 'original', captions: 'l2' },
  dub: { audio: 'dub', captions: 'off' },
  'dub+captions': { audio: 'dub', captions: 'l2' },
  bilingual: { audio: 'dub', captions: 'l2+source' },
};

/** Is the video itself already in the target language? */
export function spokenInTarget(v: VideoLanguages): boolean {
  if (v.spokenLang) return langMatches(v.spokenLang, v.targetLang);
  // Unknown audio language: a target-language track usually means target-language speech.
  return v.hasTarget;
}

/** Something to dub from: a target track over other-language speech, or translatable captions. */
export function canDub(v: VideoLanguages): boolean {
  return !spokenInTarget(v) && (v.hasTarget || v.hasSource);
}

export function resolvePlayback(preset: PlaybackPreset, v: VideoLanguages): Playback {
  if (preset === 'auto') {
    return canDub(v) ? PRESET_MODES['dub+captions'] : PRESET_MODES.captions;
  }
  const want = PRESET_MODES[preset];
  if (want.audio === 'dub' && !canDub(v)) {
    return {
      ...PRESET_MODES.captions,
      fallback: spokenInTarget(v) ? 'already-target' : 'nothing-to-dub',
    };
  }
  return want;
}

export interface SourceTrack<C> {
  lang: string;
  kind: 'manual' | 'asr';
  cues: C[];
}

/**
 * The captured non-target track to translate for dubbing: the learner's
 * native language first (best translation quality), then human-made over
 * auto-generated. `sources` is keyed `${lang}:${kind}`.
 */
export function pickSource<C>(
  sources: ReadonlyMap<string, C[]>,
  nativeLang: string,
): SourceTrack<C> | null {
  const all = [...sources].map(([key, cues]) => {
    const [lang = '', kind] = key.split(':');
    return { lang, kind: kind === 'asr' ? ('asr' as const) : ('manual' as const), cues };
  });
  const score = (s: SourceTrack<C>) =>
    (langMatches(s.lang, nativeLang) ? 0 : 2) + (s.kind === 'asr' ? 1 : 0);
  return all.filter((s) => s.cues.length).sort((a, b) => score(a) - score(b))[0] ?? null;
}
