import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import type { CSSProperties } from 'react';
import { OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS } from '../config';
import { MONO, SANS } from './fonts';

export const CARD = { w: 1600, h: 900 };

interface Word {
  t: number;
  w: string;
}

interface Props {
  file: string;
  present: boolean;
  /** Global frame at which the clip starts playing. */
  start: number;
  /** How many frames of the clip to use. */
  length: number;
  trimStart: number;
  badge: string;
  captions: readonly Word[] | null;
  volume: (globalFrame: number) => number;
  style: CSSProperties;
}

const BARS = 28;

function RealWaveform({ src, local }: { src: string; local: number }) {
  const { fps } = useVideoConfig();
  const audio = useAudioData(src);
  if (!audio) return <FakeWaveform local={local} />;
  const vals = visualizeAudio({ fps, frame: Math.max(0, local), audioData: audio, numberOfSamples: 64 });
  return <Bars values={Array.from({ length: BARS }, (_, i) => Math.min(1, (vals[i + 2] ?? 0) * 7))} />;
}

/** Stand-in bars when there's no clip yet (or its audio can't be read). */
function FakeWaveform({ local }: { local: number }) {
  const values = Array.from({ length: BARS }, (_, i) => {
    const a = Math.sin(local * 0.21 + i * 0.7) * 0.5 + 0.5;
    const b = Math.sin(local * 0.09 + i * 1.9) * 0.5 + 0.5;
    return 0.15 + a * b * 0.8;
  });
  return <Bars values={values} />;
}

function Bars({ values }: { values: number[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 44 }}>
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            width: 4,
            height: Math.max(4, v * 44),
            borderRadius: 1,
            background: i % 7 === 0 ? COLORS.accent : 'rgba(250,250,250,0.85)',
          }}
        />
      ))}
    </div>
  );
}

function Captions({ words, time }: { words: readonly Word[]; time: number }) {
  // Lines break at pauses longer than 0.6 s; show the line being spoken, word by word.
  const lines: Word[][] = [];
  words.forEach((w, i) => {
    const prev = words[i - 1];
    if (!prev || w.t - prev.t > 0.6) lines.push([]);
    lines[lines.length - 1]?.push(w);
  });
  const line = [...lines].reverse().find((l) => (l[0]?.t ?? Infinity) <= time);
  if (!line) return null;
  const lastShown = [...line].reverse().find((w) => w.t <= time);
  return (
    <div style={{ display: 'flex', gap: '0.32em', fontFamily: SANS, fontSize: 40, fontWeight: 500, letterSpacing: '-0.01em' }}>
      {line.map((w) => {
        const k = Math.min(1, Math.max(0, (time - w.t) / 0.12));
        return (
          <span
            key={`${w.t}-${w.w}`}
            style={{
              opacity: k,
              transform: `translateY(${(1 - k) * 6}px)`,
              color: w === lastShown ? COLORS.text : 'rgba(250,250,250,0.62)',
            }}
          >
            {w.w}
          </span>
        );
      })}
    </div>
  );
}

export function ClipCard(p: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - p.start;
  const time = local / fps;
  const src = staticFile(p.file);
  const live = local >= 0 && local < p.length;
  const dot = live ? 0.55 + 0.45 * Math.sin(local * 0.25) : 0.3;
  const chromeIn = interpolate(local, [-10, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        left: (1920 - CARD.w) / 2,
        top: (1080 - CARD.h) / 2,
        width: CARD.w,
        height: CARD.h,
        borderRadius: 14,
        overflow: 'hidden',
        background: COLORS.surface,
        border: `1px solid ${COLORS.lineStrong}`,
        boxShadow: '0 40px 120px rgba(0,0,0,0.55)',
        ...p.style,
      }}
    >
      {p.present ? (
        <Sequence from={p.start} durationInFrames={p.length} layout="none">
          <OffthreadVideo
            src={src}
            trimBefore={Math.round(p.trimStart * fps)}
            volume={(f) => p.volume(f + p.start)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
          }}
        >
          drop {p.file} into video/public/
        </div>
      )}

      {/* scrim so the badge, waveform and captions read on any footage */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(9,9,11,0.55) 0%, rgba(9,9,11,0) 18%, rgba(9,9,11,0) 70%, rgba(9,9,11,0.7) 100%)',
          opacity: chromeIn,
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 32,
          top: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '9px 14px',
          borderRadius: 6,
          background: 'rgba(9,9,11,0.7)',
          border: `1px solid ${COLORS.line}`,
          fontFamily: MONO,
          fontSize: 17,
          letterSpacing: '0.06em',
          color: COLORS.text,
          opacity: chromeIn,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.accent, opacity: dot }} />
        {p.badge}
      </div>

      <div style={{ position: 'absolute', left: 36, bottom: 34, opacity: chromeIn }}>
        {p.present ? <RealWaveform src={src} local={local} /> : <FakeWaveform local={local} />}
      </div>

      {p.captions && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 40, display: 'flex', justifyContent: 'center', opacity: chromeIn }}>
          <Captions words={p.captions} time={time} />
        </div>
      )}
    </div>
  );
}
