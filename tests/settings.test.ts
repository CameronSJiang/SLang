import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, normalizeSettings, redactSettings } from '../src/core/settings';

describe('normalizeSettings', () => {
  it('returns defaults for missing data', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings('garbage')).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values', () => {
    const s = normalizeSettings({
      targetLang: 'ko',
      nativeLang: 'en',
      providers: ['anthropic'],
      anthropicApiKey: '  sk-ant-abc  ',
      glossDensity: 'high',
      level: 'C1',
      vocabSize: 2400,
      overlayEnabled: false,
      captionFontSize: 30,
      captionHighContrast: true,
      captionPosition: 40,
      playbackPreset: 'bilingual',
      dubVoice: 'Paulina',
    });
    expect(s).toEqual({
      targetLang: 'ko',
      nativeLang: 'en',
      providers: ['anthropic', 'null'],
      anthropicApiKey: 'sk-ant-abc',
      glossDensity: 'high',
      level: 'C1',
      vocabSize: 2400,
      overlayEnabled: false,
      captionFontSize: 30,
      captionHighContrast: true,
      captionPosition: 40,
      playbackPreset: 'bilingual',
      dubVoice: 'Paulina',
    });
  });

  it('replaces invalid fields with defaults', () => {
    const s = normalizeSettings({ targetLang: 'xx', glossDensity: 'max', level: 'C2' });
    expect(s.targetLang).toBe('es');
    expect(s.glossDensity).toBe('auto');
    expect(s.level).toBe('A2');
  });

  it('clamps caption numbers', () => {
    const s = normalizeSettings({ captionFontSize: 500, captionPosition: -3 });
    expect(s.captionFontSize).toBe(56);
    expect(s.captionPosition).toBe(0);
    expect(normalizeSettings({ captionFontSize: 'big' }).captionFontSize).toBe(26);
  });

  it('dedupes providers and always ends with null', () => {
    const s = normalizeSettings({ providers: ['null', 'anthropic', 'bogus', 'anthropic'] });
    expect(s.providers).toEqual(['anthropic', 'null']);
  });
});

describe('redactSettings', () => {
  it('never exposes the API key', () => {
    const s = normalizeSettings({ anthropicApiKey: 'sk-ant-secret' });
    expect(JSON.stringify(redactSettings(s))).not.toContain('secret');
  });
});
