import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, PHRASE, ROUTE, TIMELINE, f } from '../config';
import { cameraAt, project } from '../lib/camera';
import { limbVisibility, toXYZ } from '../lib/geo';
import { morph } from '../lib/morph';
import { arcProgress, routeCurve } from './Globe3D';
import { MONO } from './fonts';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Where the detached phrase starts: just above the Act 1 waveform (screen px). */
export const DETACH_ORIGIN = { x: 330, y: 760 };

function Pulse({ x, y, start, opacity }: { x: number; y: number; start: number; opacity: number }) {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [start, start + f(1.1)], [0, 1], clamp);
  if (k <= 0 || k >= 1) return null;
  const e = Easing.out(Easing.cubic)(k);
  const r = 6 + e * 46;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: '50%',
        border: `1.5px solid ${COLORS.accent}`,
        opacity: (1 - k) * opacity,
      }}
    />
  );
}

function CityLabel({ x, y, name, lat, lng, opacity, align }: {
  x: number; y: number; name: string; lat: number; lng: number; opacity: number; align: 'left' | 'right';
}) {
  const coord = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`;
  return (
    <div
      style={{
        position: 'absolute',
        left: align === 'left' ? x + 16 : undefined,
        right: align === 'right' ? 1920 - x + 16 : undefined,
        top: y - 9,
        fontFamily: MONO,
        fontSize: 15,
        letterSpacing: '0.02em',
        color: COLORS.muted,
        opacity,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: COLORS.text }}>{name.toUpperCase()}</span>
      <span style={{ marginLeft: 10 }}>{coord}</span>
    </div>
  );
}

export function GlobeOverlay({ opacity }: { opacity: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cam = cameraAt(frame);
  const T = TIMELINE;

  const fromP = toXYZ(ROUTE.from.lat, ROUTE.from.lng, 0.004);
  const toP = toXYZ(ROUTE.to.lat, ROUTE.to.lng, 0.004);
  const fromS = project(fromP, cam);
  const toS = project(toP, cam);
  const fromVis = limbVisibility(fromP, cam.position);
  const toVis = limbVisibility(toP, cam.position);

  // The phrase: detaches from the waveform, flies to the origin city, then rides the arc.
  const t = arcProgress(frame);
  const onArc = frame >= f(T.arcStart);
  const arcPoint = routeCurve(t);
  const arcS = project(arcPoint, cam);
  const lift = spring({ frame: frame - f(T.phraseDetach), fps, config: { damping: 200 }, durationInFrames: f(T.arcStart - T.phraseDetach) });
  const head = onArc
    ? arcS
    : { x: interpolate(lift, [0, 1], [DETACH_ORIGIN.x, fromS.x]), y: interpolate(lift, [0, 1], [DETACH_ORIGIN.y, fromS.y]) };
  const phraseVisible = frame >= f(T.phraseDetach) && frame < f(T.dubZoom + 0.3);
  const phraseOpacity =
    interpolate(frame, [f(T.phraseDetach), f(T.phraseDetach + 0.25)], [0, 1], clamp) *
    interpolate(frame, [f(T.arcLand + 0.6), f(T.dubZoom + 0.3)], [1, 0], clamp) *
    (onArc ? limbVisibility(arcPoint, cam.position) : 1);
  const text = onArc ? morph(PHRASE.from, PHRASE.to, t) : PHRASE.from;
  const settled = !onArc || t <= 0.2 || t >= 0.8;
  const labelsIn = interpolate(frame, [f(T.arcStart - 0.4), f(T.arcStart + 0.2)], [0, 1], clamp);
  const labelsOut = interpolate(frame, [f(T.dubZoom), f(T.dubZoom + 0.4)], [1, 0], clamp);

  return (
    <div style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none' }}>
      <Pulse x={fromS.x} y={fromS.y} start={f(T.arcStart)} opacity={fromVis} />
      <Pulse x={toS.x} y={toS.y} start={f(T.arcLand)} opacity={toVis} />
      <CityLabel x={fromS.x} y={fromS.y} {...ROUTE.from} opacity={labelsIn * labelsOut * fromVis} align="right" />
      <CityLabel x={toS.x} y={toS.y} {...ROUTE.to} opacity={labelsIn * labelsOut * toVis} align="left" />
      {phraseVisible && (
        <div style={{ position: 'absolute', left: head.x, top: head.y, opacity: phraseOpacity }}>
          {/* packet head */}
          <div
            style={{
              position: 'absolute',
              left: -5,
              top: -5,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: COLORS.accent,
              boxShadow: `0 0 18px ${COLORS.accent}`,
            }}
          />
          {/* leader + plate */}
          <div style={{ position: 'absolute', left: -0.5, top: -44, width: 1, height: 36, background: 'rgba(242,169,59,0.45)' }} />
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: -84,
              transform: 'translateX(-50%)',
              padding: '8px 16px',
              borderRadius: 6,
              background: 'rgba(9,9,11,0.82)',
              border: `1px solid ${COLORS.lineStrong}`,
              fontFamily: MONO,
              fontSize: 26,
              fontWeight: 500,
              letterSpacing: '0.01em',
              color: settled ? COLORS.text : '#E9D5B0',
              textShadow: '0 0 14px rgba(242,169,59,0.45)',
              whiteSpace: 'pre',
            }}
          >
            {text}
          </div>
        </div>
      )}
    </div>
  );
}
