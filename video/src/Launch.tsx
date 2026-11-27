import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { CAPTIONS, CLIPS, COLORS, COPY, HEIGHT, ROUTE, TIMELINE, WIDTH, f } from './config';
import { cameraAt, project } from './lib/camera';
import { toXYZ } from './lib/geo';
import { EndCard, HudCard } from './components/Cards';
import { CARD, ClipCard } from './components/ClipCard';
import { Globe3D } from './components/Globe3D';
import { GlobeOverlay } from './components/GlobeOverlay';

export type LaunchProps = {
  hasEnglish: boolean;
  hasDubbed: boolean;
};

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const T = TIMELINE;

export function Launch({ hasEnglish, hasDubbed }: LaunchProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* ---- Act 1: English card, slow push-in, then tilts back into space ---- */
  const push = interpolate(frame, [0, f(T.tiltStart)], [0.94, 1], clamp);
  const tilt = spring({ frame: frame - f(T.tiltStart), fps, config: { damping: 200 }, durationInFrames: f(1.0) });
  const enOpacity = interpolate(frame, [f(T.tiltStart + 0.35), f(T.tiltStart + 0.95)], [1, 0], clamp);
  const enStyle = {
    transform: `translateY(${-tilt * 60}px) scale(${push * (1 - tilt * 0.56)}) rotateX(${tilt * 34}deg)`,
    opacity: enOpacity,
    transformOrigin: '50% 60%',
  };

  /* ---- Act 2: globe ---- */
  const globeOpacity =
    interpolate(frame, [f(T.globeIn), f(T.globeIn + 0.8)], [0, 1], clamp) *
    interpolate(frame, [f(T.dubStart + 0.15), f(T.dubStart + 0.75)], [1, 0], clamp);
  const globeOn = frame >= f(T.globeIn) - 2 && frame <= f(T.dubStart + 0.8);

  /* ---- Act 3: dubbed card grows out of the destination city ---- */
  const grow = spring({ frame: frame - f(T.dubZoom + 0.25), fps, config: { damping: 200 }, durationInFrames: f(0.9) });
  const dest = project(toXYZ(ROUTE.to.lat, ROUTE.to.lng), cameraAt(Math.min(frame, f(T.dubStart + 0.7))));
  const dx = (dest.x - WIDTH / 2) * (1 - grow);
  const dy = (dest.y - HEIGHT / 2) * (1 - grow);
  const endOut = spring({ frame: frame - f(T.endCard), fps, config: { damping: 200 }, durationInFrames: f(0.7) });
  const dubStyle = {
    transform: `translate(${dx}px, ${dy}px) scale(${(0.03 + 0.97 * grow) * (1 - endOut * 0.08)})`,
    opacity: interpolate(frame, [f(T.dubZoom + 0.25), f(T.dubZoom + 0.5)], [0, 1], clamp) * (1 - endOut),
    borderRadius: interpolate(grow, [0, 1], [CARD.h / 2, 14]),
  };
  const dubOn = frame >= f(T.dubZoom + 0.2) && frame < f(T.endCard + 0.8);

  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: 'hidden' }}>
      {/* faint cobalt light behind the globe; keeps the black from feeling flat */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse 60% 55% at 50% 52%, rgba(59,110,245,0.10), rgba(9,9,11,0) 70%)',
          opacity: globeOpacity,
        }}
      />

      {globeOn && <Globe3D opacity={globeOpacity} />}

      <AbsoluteFill style={{ perspective: 2200 }}>
        {frame < f(T.tiltStart + 1.1) && (
          <ClipCard
            file={CLIPS.english.file}
            present={hasEnglish}
            start={f(T.englishStart)}
            length={f(T.tiltStart + 1.1)}
            trimStart={CLIPS.english.trimStart}
            badge={COPY.sourceBadge}
            captions={CAPTIONS.english.show ? CAPTIONS.english.words : null}
            volume={(g) => interpolate(g, [f(T.tiltStart - 0.3), f(T.tiltStart + 0.6)], [1, 0], clamp)}
            style={enStyle}
          />
        )}
      </AbsoluteFill>

      {globeOn && <GlobeOverlay opacity={1} />}
      <HudCard />

      {dubOn && (
        <ClipCard
          file={CLIPS.dubbed.file}
          present={hasDubbed}
          start={f(T.dubStart)}
          length={f(T.endCard + 0.8 - T.dubStart)}
          trimStart={CLIPS.dubbed.trimStart}
          badge={COPY.dubBadge}
          captions={CAPTIONS.dubbed.show ? CAPTIONS.dubbed.words : null}
          volume={(g) =>
            interpolate(g, [f(T.dubStart), f(T.dubStart + 0.25)], [0, 1], clamp) *
            interpolate(g, [f(T.endCard - 0.2), f(T.endCard + 0.4)], [1, 0], clamp)
          }
          style={dubStyle}
        />
      )}

      <EndCard />

      {/* Sound design */}
      <Sequence from={f(T.globeIn - 0.05)} durationInFrames={f(1.7)}>
        <Audio src={staticFile('sfx/whoosh.wav')} volume={0.6} />
      </Sequence>
      <Sequence from={f(T.arcLand - 0.02)} durationInFrames={f(2.2)}>
        <Audio src={staticFile('sfx/chime.wav')} volume={0.5} />
      </Sequence>
      <Sequence from={f(T.dubZoom - 0.05)} durationInFrames={f(1.7)}>
        <Audio src={staticFile('sfx/whoosh.wav')} volume={0.45} playbackRate={1.25} />
      </Sequence>
    </AbsoluteFill>
  );
}
