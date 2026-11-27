import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FLIGHTS, f } from '../config';
import { cameraAt, project } from '../lib/camera';
import { limbVisibility, toXYZ } from '../lib/geo';
import { morph } from '../lib/morph';
import { flightCurves } from './Globe3D';
import { MONO } from './fonts';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const DOT = 16; // px: the size a card collapses to, and the flying dot

function Pulse({ x, y, start }: { x: number; y: number; start: number }) {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [start, start + f(1.0)], [0, 1], clamp);
  if (k <= 0 || k >= 1) return null;
  const r = 8 + Easing.out(Easing.cubic)(k) * 52;
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
        opacity: 1 - k,
      }}
    />
  );
}

function CityLabel({ x, y, city, opacity, side }: {
  x: number; y: number; opacity: number; side: 'left' | 'right';
  city: { name: string; country: string; lat: number; lng: number };
}) {
  const coord = `${Math.abs(city.lat).toFixed(2)}°${city.lat >= 0 ? 'N' : 'S'} ${Math.abs(city.lng).toFixed(2)}°${city.lng >= 0 ? 'E' : 'W'}`;
  return (
    <div
      style={{
        position: 'absolute',
        top: y - 10,
        ...(side === 'left' ? { right: 1920 - x + 18 } : { left: x + 18 }),
        fontFamily: MONO,
        fontSize: 16,
        letterSpacing: '0.06em',
        color: COLORS.muted,
        whiteSpace: 'nowrap',
        textAlign: side === 'left' ? 'right' : 'left',
        opacity,
      }}
    >
      <div style={{ color: COLORS.text }}>
        {city.name.toUpperCase()}, {city.country.toUpperCase()}
      </div>
      <div style={{ marginTop: 4, fontSize: 14 }}>{coord}</div>
    </div>
  );
}

/** Dots, morphing language label, city labels and pulses for both flights. */
export function FlightOverlay() {
  const frame = useCurrentFrame();
  const cam = cameraAt(frame);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {FLIGHTS.map((fl, i) => {
        const window = frame >= f(fl.start - 0.7) && frame <= f(fl.land + 1.2);
        if (!window) return null;
        const curve = flightCurves[i];
        if (!curve) return null;
        const fromP = toXYZ(fl.from.lat, fl.from.lng, 0.004);
        const toP = toXYZ(fl.to.lat, fl.to.lng, 0.004);
        const fromS = project(fromP, cam);
        const toS = project(toP, cam);
        const t = interpolate(frame, [f(fl.start), f(fl.land)], [0, 1], clamp);
        const flying = frame >= f(fl.start) && frame <= f(fl.land);
        const headP = curve(t);
        const head = project(headP, cam);
        const vis = limbVisibility(headP, cam.position);
        const labels =
          interpolate(frame, [f(fl.start - 0.5), f(fl.start)], [0, 1], clamp) *
          interpolate(frame, [f(fl.land + 0.5), f(fl.land + 0.9)], [1, 0], clamp);
        const pillIn = interpolate(frame, [f(fl.start), f(fl.start + 0.2)], [0, 1], clamp);
        const text = morph(fl.label[0], fl.label[1], t);
        const settled = t <= 0.2 || t >= 0.8;
        // New York sits left of Madrid on screen; keep its label on the outside.
        const fromLeft = fromS.x < toS.x;
        return (
          <div key={i}>
            <Pulse x={fromS.x} y={fromS.y} start={f(fl.start)} />
            <Pulse x={toS.x} y={toS.y} start={f(fl.land)} />
            <CityLabel x={fromS.x} y={fromS.y} city={fl.from} opacity={labels} side={fromLeft ? 'left' : 'right'} />
            <CityLabel x={toS.x} y={toS.y} city={fl.to} opacity={labels} side={fromLeft ? 'right' : 'left'} />
            {flying && (
              <div style={{ position: 'absolute', left: head.x, top: head.y, opacity: vis }}>
                <div
                  style={{
                    position: 'absolute',
                    left: -DOT / 2,
                    top: -DOT / 2,
                    width: DOT,
                    height: DOT,
                    borderRadius: '50%',
                    background: COLORS.accent,
                    boxShadow: `0 0 22px 4px rgba(242,169,59,0.55)`,
                  }}
                />
                <div style={{ position: 'absolute', left: -0.5, top: -50, width: 1, height: 38, background: 'rgba(242,169,59,0.5)', opacity: pillIn }} />
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: -92,
                    transform: 'translateX(-50%)',
                    padding: '8px 18px',
                    borderRadius: 999,
                    background: 'rgba(9,9,11,0.85)',
                    border: `1px solid ${COLORS.lineStrong}`,
                    fontFamily: MONO,
                    fontSize: 26,
                    fontWeight: 500,
                    letterSpacing: '0.14em',
                    color: settled ? COLORS.text : '#E9D5B0',
                    textShadow: '0 0 14px rgba(242,169,59,0.45)',
                    whiteSpace: 'pre',
                    opacity: pillIn,
                  }}
                >
                  {text}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** "MODE // …" callout that flashes in as a flight lands. */
export function HudFlash({ text, at, until }: { text: string; at: number; until: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inS = spring({ frame: frame - f(at), fps, config: { damping: 18, stiffness: 220, mass: 0.6 }, durationInFrames: f(0.45) });
  const flash = interpolate(frame, [f(at), f(at + 0.08), f(at + 0.25)], [0, 1, 0.35], clamp);
  const out = interpolate(frame, [f(until - 0.25), f(until)], [1, 0], clamp);
  const o = Math.min(1, inS) * out;
  if (frame < f(at) || o <= 0.001) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 120, display: 'flex', justifyContent: 'center', opacity: o }}>
      <div
        style={{
          position: 'relative',
          padding: '16px 28px',
          border: `1px solid rgba(242,169,59,${0.45 + 0.4 * flash})`,
          borderRadius: 8,
          background: `rgba(242,169,59,${0.06 + 0.16 * flash})`,
          fontFamily: MONO,
          fontSize: 30,
          fontWeight: 500,
          letterSpacing: '0.16em',
          color: COLORS.text,
          transform: `scale(${0.96 + 0.04 * inS})`,
          boxShadow: `0 0 ${20 + 40 * flash}px rgba(242,169,59,${0.12 + 0.25 * flash})`,
        }}
      >
        <span style={{ color: COLORS.accent }}>◆ </span>
        {text}
      </div>
    </div>
  );
}
