import { Video } from '@remotion/media';
import { Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, HEIGHT, WIDTH } from '../config';
import { DOT } from './FlightOverlay';
import { MONO } from './fonts';

export const CARD = { w: 1600, h: 900 };

/**
 * k = 0: full card at (cx, cy). k = 1: a glowing DOT-sized circle.
 * Size shrinks geometrically, so it reads as one smooth scale rather than a slide.
 */
export function cardRect(k: number, cx: number, cy: number) {
  const w = CARD.w * Math.pow(DOT / CARD.w, k);
  const h = CARD.h * Math.pow(DOT / CARD.h, k);
  const radius = 14 + (Math.min(w, h) / 2 - 14) * Math.min(1, k * 1.2);
  return { x: cx - w / 2, y: cy - h / 2, w, h, radius: Math.max(0, radius) };
}

interface Props {
  file: string;
  present: boolean;
  badge: string;
  /** Global frame where the clip starts playing, and for how many frames. */
  start: number;
  length: number;
  trimStart: number;
  volume: (globalFrame: number) => number;
  /** 0 = full card, 1 = dot. */
  k: number;
  cx?: number;
  cy?: number;
  /** Extra transform for whip-pans and the end pull-back. */
  transform?: string;
  filter?: string;
  opacity?: number;
}

export function MorphCard(p: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const r = cardRect(p.k, p.cx ?? WIDTH / 2, p.cy ?? HEIGHT / 2);
  const dotness = Math.min(1, Math.max(0, (p.k - 0.55) / 0.4)); // amber fill as it becomes a dot
  const chrome = Math.max(0, 1 - p.k * 4); // badge fades as soon as it starts shrinking
  const live = frame >= p.start && frame < p.start + p.length;

  return (
    <div
      style={{
        position: 'absolute',
        left: r.x,
        top: r.y,
        width: r.w,
        height: r.h,
        borderRadius: r.radius,
        overflow: 'hidden',
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        boxShadow:
          p.k > 0.02
            ? `0 0 ${12 + 30 * p.k}px ${2 + 6 * p.k}px rgba(242,169,59,${0.12 + 0.45 * p.k})`
            : '0 40px 120px rgba(0,0,0,0.55)',
        transform: p.transform,
        filter: p.filter,
        opacity: p.opacity ?? 1,
      }}
    >
      {p.present ? (
        <Sequence from={p.start} durationInFrames={p.length} layout="none">
          <Video
            src={staticFile(p.file)}
            trimBefore={Math.round(p.trimStart * fps)}
            volume={(fr) => p.volume(fr + p.start)}
            objectFit="cover"
            style={{ width: '100%', height: '100%' }}
          />
        </Sequence>
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            background:
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 60px), repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 60px), #0d0d10',
            fontFamily: MONO,
            fontSize: 22,
            color: COLORS.dim,
            opacity: chrome,
          }}
        >
          drop {p.file} into video/public/
        </div>
      )}

      {/* becomes the glowing dot */}
      <div style={{ position: 'absolute', inset: 0, background: COLORS.accent, opacity: dotness }} />

      <div
        style={{
          position: 'absolute',
          left: 30,
          top: 26,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '9px 14px',
          borderRadius: 6,
          background: 'rgba(9,9,11,0.72)',
          border: `1px solid ${COLORS.border}`,
          fontFamily: MONO,
          fontSize: 17,
          fontWeight: 500,
          letterSpacing: '0.1em',
          color: COLORS.text,
          opacity: chrome,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: COLORS.accent,
            opacity: live ? 0.55 + 0.45 * Math.sin(frame * 0.25) : 0.35,
          }}
        />
        {p.badge}
      </div>
    </div>
  );
}
