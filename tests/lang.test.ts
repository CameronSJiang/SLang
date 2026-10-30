import { describe, expect, it } from 'vitest';
import { hasLang, langMatches, pickTrack, type TrackInfo } from '../src/core/lang';

describe('langMatches', () => {
  it('matches base and regional codes', () => {
    expect(langMatches('es', 'es')).toBe(true);
    expect(langMatches('es-419', 'es')).toBe(true);
    expect(langMatches('ES-es', 'es')).toBe(true);
    expect(langMatches('en', 'es')).toBe(false);
    expect(langMatches('est', 'es')).toBe(false);
  });
});

describe('pickTrack', () => {
  const en: TrackInfo = { lang: 'en', kind: 'manual' };
  const esAsr: TrackInfo = { lang: 'es', kind: 'asr' };
  const es: TrackInfo = { lang: 'es-419', kind: 'manual' };

  it('prefers manual target-language tracks, then auto', () => {
    expect(pickTrack([en, esAsr, es], 'es')).toBe(es);
    expect(pickTrack([en, esAsr], 'es')).toBe(esAsr);
  });

  it('falls back to any track, manual first', () => {
    const enAsr: TrackInfo = { lang: 'en', kind: 'asr' };
    expect(pickTrack([enAsr, en], 'es')).toBe(en);
    expect(pickTrack([], 'es')).toBeUndefined();
    expect(hasLang([enAsr, en], 'es')).toBe(false);
  });
});
