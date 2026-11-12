import type { PlaybackPreset } from '../core/playback';

export const PRESET_INFO: Record<PlaybackPreset, { label: string; emoji: string; desc: string }> = {
  auto: {
    label: 'Auto',
    emoji: '✨',
    desc: 'Captions on videos already in your new language, dubbing on everything else.',
  },
  captions: { label: 'Captions', emoji: '💬', desc: 'Original audio with captions you can click.' },
  dub: { label: 'Dub', emoji: '🎙️', desc: 'Hear it in your new language. No captions.' },
  'dub+captions': {
    label: 'Dub + captions',
    emoji: '🎧',
    desc: 'Hear it and read along. The full immersion package.',
  },
  bilingual: {
    label: 'Bilingual',
    emoji: '🌗',
    desc: 'Dub plus captions in both languages. Training wheels on.',
  },
};

export const PRESET_SHORT: Record<PlaybackPreset, string> = Object.fromEntries(
  Object.entries(PRESET_INFO).map(([k, v]) => [k, v.label]),
) as Record<PlaybackPreset, string>;
