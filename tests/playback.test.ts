import { describe, expect, it } from 'vitest';
import { canDub, pickSource, resolvePlayback, type VideoLanguages } from '../src/core/playback';

const english: VideoLanguages = {
  targetLang: 'es',
  spokenLang: 'en',
  hasTarget: false,
  hasSource: true,
};
const spanish: VideoLanguages = {
  targetLang: 'es',
  spokenLang: 'es',
  hasTarget: true,
  hasSource: false,
};
const englishWithSpanishSubs: VideoLanguages = { ...english, hasTarget: true };

describe('resolvePlayback', () => {
  it('auto: captions for Spanish videos, dub + captions for others', () => {
    expect(resolvePlayback('auto', spanish)).toEqual({ audio: 'original', captions: 'l2' });
    expect(resolvePlayback('auto', english)).toEqual({ audio: 'dub', captions: 'l2' });
    expect(resolvePlayback('auto', englishWithSpanishSubs)).toEqual({
      audio: 'dub',
      captions: 'l2',
    });
  });

  it('presets map to audio + caption layers', () => {
    expect(resolvePlayback('dub', english)).toEqual({ audio: 'dub', captions: 'off' });
    expect(resolvePlayback('bilingual', english)).toEqual({ audio: 'dub', captions: 'l2+source' });
    expect(resolvePlayback('captions', english)).toEqual({ audio: 'original', captions: 'l2' });
  });

  it('falls back to captions when there is nothing to dub', () => {
    expect(resolvePlayback('dub', spanish)).toMatchObject({
      audio: 'original',
      fallback: 'already-target',
    });
    const silent = { ...english, hasSource: false };
    expect(resolvePlayback('dub+captions', silent)).toMatchObject({ fallback: 'nothing-to-dub' });
  });

  it('guesses from tracks when the spoken language is unknown', () => {
    expect(canDub({ ...english, spokenLang: null })).toBe(true);
    expect(canDub({ ...spanish, spokenLang: null })).toBe(false);
  });
});

describe('pickSource', () => {
  it('prefers the native language, then human-made captions', () => {
    const m = new Map([
      ['fr:manual', [1]],
      ['en:asr', [2]],
      ['en:manual', [3]],
    ]);
    expect(pickSource(m, 'en')).toEqual({ lang: 'en', kind: 'manual', cues: [3] });
    expect(
      pickSource(
        new Map([
          ['fr:asr', [1]],
          ['de:manual', [2]],
        ]),
        'en',
      )?.lang,
    ).toBe('de');
    expect(pickSource(new Map([['en:manual', []]]), 'en')).toBeNull();
  });
});
