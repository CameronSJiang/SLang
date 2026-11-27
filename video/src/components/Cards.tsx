import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, COPY, TIMELINE, f } from '../config';
import { MONO, SANS } from './fonts';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** "VOICE + CAPTIONS + WORD HINTS / Now in Español." — appears as the phrase lands. */
export function HudCard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const T = TIMELINE;
  const inS = spring({ frame: frame - f(T.hudIn), fps, config: { damping: 200 }, durationInFrames: f(0.7) });
  const out = interpolate(frame, [f(T.dubZoom - 0.1), f(T.dubZoom + 0.35)], [1, 0], clamp);
  const o = inS * out;
  if (o <= 0.001) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 140,
        bottom: 150,
        opacity: o,
        transform: `translateY(${(1 - inS) * 24}px)`,
        padding: '30px 38px 34px',
        borderRadius: 10,
        background: 'rgba(9,9,11,0.78)',
        border: `1px solid ${COLORS.lineStrong}`,
        boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: MONO, fontSize: 18, letterSpacing: '0.08em', color: COLORS.accent }}>
        <span style={{ width: 22, height: 1, background: COLORS.accent }} />
        {COPY.hudTag}
      </div>
      <div style={{ marginTop: 14, fontFamily: SANS, fontWeight: 600, fontSize: 92, lineHeight: 1, letterSpacing: '-0.03em', color: COLORS.text }}>
        {COPY.hudHeadline}
      </div>
    </div>
  );
}

export function EndCard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = f(TIMELINE.endCard + 0.15);
  const s = (delay: number) => spring({ frame: frame - start - f(delay), fps, config: { damping: 200 }, durationInFrames: f(0.8) });
  const a = s(0);
  const b = s(0.15);
  const c = s(0.3);
  if (a <= 0.001) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, opacity: a, transform: `translateY(${(1 - a) * 20}px)` }}>
          <Img src={staticFile('icon.png')} style={{ width: 88, height: 88, borderRadius: 20 }} />
          <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 104, letterSpacing: '-0.04em', color: COLORS.text }}>
            {COPY.brand}
          </span>
        </div>
        <div
          style={{
            marginTop: 26,
            fontFamily: SANS,
            fontWeight: 500,
            fontSize: 46,
            letterSpacing: '-0.025em',
            color: COLORS.text,
            opacity: b,
            transform: `translateY(${(1 - b) * 16}px)`,
          }}
        >
          {COPY.valueProp}
        </div>
        <div
          style={{
            marginTop: 40,
            paddingTop: 22,
            borderTop: `1px solid ${COLORS.line}`,
            fontFamily: MONO,
            fontSize: 24,
            letterSpacing: '0.02em',
            color: COLORS.muted,
            opacity: c,
          }}
        >
          {COPY.url}
        </div>
      </div>
    </div>
  );
}
