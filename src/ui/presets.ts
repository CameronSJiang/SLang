import type { PlaybackPreset } from '../core/playback';
import type { IconName } from './icons';

export const PRESET_INFO: Record<PlaybackPreset, { label: string; icon: IconName; desc: string }> =
  {
    auto: {
      label: 'Auto',
      icon: 'sparkles',
      desc: 'Captions on videos already in your new language, dubbing on everything else.',
    },
    captions: {
      label: 'Captions',
      icon: 'captions',
      desc: 'Original audio with captions you can click.',
    },
    dub: { label: 'Dub', icon: 'mic', desc: 'Hear it in your new language. No captions.' },
    'dub+captions': {
      label: 'Dub + captions',
      icon: 'headphones',
      desc: 'Hear it and read along. The full immersion package.',
    },
    bilingual: {
      label: 'Bilingual',
      icon: 'languages',
      desc: 'Dub plus captions in both languages. Training wheels on.',
    },
  };

export const PRESET_SHORT: Record<PlaybackPreset, string> = Object.fromEntries(
  Object.entries(PRESET_INFO).map(([k, v]) => [k, v.label]),
) as Record<PlaybackPreset, string>;
