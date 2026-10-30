import { describe, expect, it } from 'vitest';
import { parseIsoMessage, parseMainMessage, timedtextInfo } from '../src/adapters/bridge';

const TT = 'https://www.youtube.com/api/timedtext?v=abc123&lang=es&kind=asr&fmt=json3&pot=x';

describe('timedtextInfo', () => {
  it('reads video, language and kind', () => {
    expect(timedtextInfo(TT)).toEqual({ videoId: 'abc123', lang: 'es', kind: 'asr', fmt: 'json3' });
    expect(timedtextInfo('/api/timedtext?v=a&lang=en')).toMatchObject({
      kind: 'manual',
      lang: 'en',
    });
  });

  it('uses the translation target for auto-translated tracks', () => {
    expect(timedtextInfo('/api/timedtext?v=a&lang=en&tlang=es')?.lang).toBe('es');
  });

  it('rejects other URLs', () => {
    expect(timedtextInfo('https://www.youtube.com/watch?v=a&lang=es')).toBeNull();
    expect(timedtextInfo('/api/timedtext?lang=es')).toBeNull();
    expect(timedtextInfo('http://[bad')).toBeNull();
  });
});

describe('message validation', () => {
  it('accepts well-formed messages', () => {
    expect(
      parseMainMessage({ ns: 'slang', dir: 'main', type: 'timedtext', url: TT, body: '{}' }),
    ).not.toBeNull();
    expect(
      parseMainMessage({
        ns: 'slang',
        dir: 'main',
        type: 'tracks',
        videoId: 'a',
        tracks: [{ lang: 'es', kind: 'asr' }],
      }),
    ).not.toBeNull();
    expect(
      parseIsoMessage({ ns: 'slang', dir: 'iso', type: 'config', targetLang: 'es', enabled: true }),
    ).not.toBeNull();
  });

  it('rejects look-alikes', () => {
    expect(
      parseMainMessage({ ns: 'slang', dir: 'iso', type: 'timedtext', url: TT, body: '' }),
    ).toBeNull();
    expect(
      parseMainMessage({ ns: 'slang', dir: 'main', type: 'timedtext', url: '/x', body: '' }),
    ).toBeNull();
    expect(
      parseMainMessage({
        ns: 'slang',
        dir: 'main',
        type: 'tracks',
        videoId: 'a',
        tracks: [{ lang: 1 }],
      }),
    ).toBeNull();
    expect(
      parseIsoMessage({ ns: 'slang', dir: 'iso', type: 'config', targetLang: 'es' }),
    ).toBeNull();
    expect(parseMainMessage(null)).toBeNull();
  });
});
