import type { PlaybackPreset } from '../core/playback';

export const PRESET_LABELS: Record<PlaybackPreset, string> = {
  auto: 'Auto (captions for Spanish-language videos, dub for others)',
  captions: 'Captions only',
  dub: 'Dub only',
  'dub+captions': 'Dub + captions',
  bilingual: 'Bilingual (dub + both caption languages)',
};

export const PRESET_SHORT: Record<PlaybackPreset, string> = {
  auto: 'Auto',
  captions: 'Captions',
  dub: 'Dub',
  'dub+captions': 'Dub + captions',
  bilingual: 'Bilingual',
};
