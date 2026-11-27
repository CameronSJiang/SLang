import { Audio } from '@remotion/media';
import { AbsoluteFill, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { CITIES, COLORS, COPY, FILES, MUSIC, T, WIDTH, f, type ClipKey } from './config';
import { cityOnScreen } from './lib/camera';
import { FlightOverlay, HudFlash } from './components/FlightOverlay';
import { Globe3D } from './components/Globe3D';
import { MorphCard } from './components/MorphCard';
import { MONO, SANS } from './components/fonts';

export type CommercialProps = {
  present: Record<ClipKey | 'music', boolean>;
};

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Music volume keyframes: ducked under speech, up for flights and the end card. */
function musicVolume(frame: number): number {
  const { speech: lo, flight: hi, ramp } = MUSIC;
  const r = ramp / 2;
  const keys: [number, number][] = [
    [0, 0],
    [0.3, lo],
    [T.collapse1 - r, lo],
    [T.collapse1 + r, hi],
    [T.dubbedPlay - r, hi],
    [T.dubbedPlay + r, lo],
    [T.collapse2 - r, lo],
    [T.collapse2 + r, hi],
    [T.captionedPlay - r, hi],
    [T.captionedPlay + r, lo],
    [T.endCard - r, lo],
    [T.endCard + r, hi],
    [T.end - 0.6, hi],
    [T.end, 0],
  ];
  return interpolate(
    frame,
    keys.map(([s]) => f(s)),
    keys.map(([, v]) => v),
    clamp,
  );
}

/** A clip's own audio: in after it appears, out as it leaves. */
const clipVolume = (inAt: number, outAt: number) => (frame: number) =>
  interpolate(frame, [f(inAt), f(inAt + 0.15)], [0, 1], clamp) *
  interpolate(frame, [f(outAt), f(outAt + 0.4)], [1, 0], clamp);

export function Commercial({ present }: CommercialProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = (at: number, dur: number) =>
    spring({ frame: frame - f(at), fps, config: { damping: 200 }, durationInFrames: f(dur) });

  // Globe: on during each flight sequence.
  const globeOpacity = Math.max(
    interpolate(frame, [f(T.collapse1 - 0.1), f(T.collapse1 + 0.35), f(T.expand1 + 0.45), f(T.expand1 + 0.8)], [0, 1, 1, 0], clamp),
    interpolate(frame, [f(T.collapse2 - 0.1), f(T.collapse2 + 0.35), f(T.expand2 + 0.45), f(T.expand2 + 0.8)], [0, 1, 1, 0], clamp),
  );
  const globeOn = globeOpacity > 0.001;

  // Part 1: English card collapses into New York…
  const k1 = sp(T.collapse1, T.flight1 - T.collapse1);
  const ny1 = cityOnScreen(CITIES.newYork, frame);
  // …the Madrid dot grows into the dubbed clip.
  const k2 = 1 - sp(T.expand1, 0.7);
  const md1 = cityOnScreen(CITIES.madrid, Math.min(frame, f(T.expand1 + 0.7)));

  // Whip-pan between the parts.
  const whip = sp(T.whip, 0.55);
  const whipBlur = Math.sin(Math.PI * whip) * 14;

  // Part 2: Spanish card collapses into Madrid…
  const k3 = sp(T.collapse2, T.flight2 - T.collapse2);
  const md2 = cityOnScreen(CITIES.madrid, frame);
  // …the New York dot grows into the captioned clip.
  const k4 = 1 - sp(T.expand2, 0.7);
  const ny2 = cityOnScreen(CITIES.newYork, Math.min(frame, f(T.expand2 + 0.7)));

  // Close: pull back to the end slate.
  const pull = sp(T.endCard, 0.7);
  const slate = sp(T.endCard + 0.15, 0.8);
  const slate2 = sp(T.endCard + 0.3, 0.8);

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const W2 = WIDTH / 2;
  const H2 = 1080 / 2;

  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse 60% 55% at 50% 52%, rgba(59,110,245,0.10), rgba(9,9,11,0) 70%)',
          opacity: globeOpacity,
        }}
      />
      {globeOn && <Globe3D opacity={globeOpacity} />}
      {globeOn && <FlightOverlay />}

      {/* 1. English source → dot on New York */}
      {frame < f(T.flight1) + 1 && (
        <MorphCard
          file={FILES.englishSource.file}
          present={present.englishSource}
          badge={COPY.badges.englishSource}
          start={f(T.englishIn)}
          length={f(T.flight1)}
          trimStart={FILES.englishSource.trimStart}
          volume={clipVolume(T.englishIn, T.collapse1)}
          k={k1}
          cx={lerp(W2, ny1.x, k1)}
          cy={lerp(H2, ny1.y, k1)}
        />
      )}

      {/* 3. Madrid dot → Spanish dubbed clip, then whip-pans out left */}
      {frame >= f(T.expand1) && frame < f(T.whip + 0.6) && (
        <MorphCard
          file={FILES.spanishDubbed.file}
          present={present.spanishDubbed}
          badge={COPY.badges.spanishDubbed}
          start={f(T.expand1)}
          length={f(T.whip + 0.6 - T.expand1)}
          trimStart={FILES.spanishDubbed.trimStart}
          volume={clipVolume(T.dubbedPlay - 0.1, T.whip - 0.1)}
          k={k2}
          cx={lerp(W2, md1.x, k2)}
          cy={lerp(H2, md1.y, k2)}
          transform={`translateX(${-whip * WIDTH * 1.1}px)`}
          filter={whipBlur > 0.5 ? `blur(${whipBlur}px)` : undefined}
        />
      )}

      {/* 4. Spanish source slides in from the right → dot on Madrid */}
      {frame >= f(T.whip) - 2 && frame < f(T.flight2) + 1 && (
        <MorphCard
          file={FILES.spanishSource.file}
          present={present.spanishSource}
          badge={COPY.badges.spanishSource}
          start={f(T.whip)}
          length={f(T.flight2 - T.whip)}
          trimStart={FILES.spanishSource.trimStart}
          volume={clipVolume(T.whip + 0.1, T.collapse2)}
          k={k3}
          cx={lerp(W2, md2.x, k3)}
          cy={lerp(H2, md2.y, k3)}
          transform={`translateX(${(1 - whip) * WIDTH * 1.1}px)`}
          filter={whipBlur > 0.5 ? `blur(${whipBlur}px)` : undefined}
        />
      )}

      {/* 6. New York dot → English-captioned clip, then pulls back */}
      {frame >= f(T.expand2) && frame < f(T.endCard + 0.8) && (
        <MorphCard
          file={FILES.englishCaptioned.file}
          present={present.englishCaptioned}
          badge={COPY.badges.englishCaptioned}
          start={f(T.expand2)}
          length={f(T.endCard + 0.8 - T.expand2)}
          trimStart={FILES.englishCaptioned.trimStart}
          volume={clipVolume(T.captionedPlay - 0.1, T.endCard)}
          k={k4}
          cx={lerp(W2, ny2.x, k4)}
          cy={lerp(H2, ny2.y, k4)}
          transform={`scale(${1 - pull * 0.12})`}
          opacity={1 - pull}
        />
      )}

      <HudFlash text={COPY.hud1} at={T.land1} until={T.expand1 + 0.6} />
      <HudFlash text={COPY.hud2} at={T.land2} until={T.expand2 + 0.6} />

      {/* 7. End slate */}
      {slate > 0.001 && (
        <AbsoluteFill style={{ display: 'grid', placeItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 26, opacity: slate, transform: `translateY(${(1 - slate) * 18}px)` }}>
              <Img src={staticFile('icon.png')} style={{ width: 92, height: 92, borderRadius: 22 }} />
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 132, letterSpacing: '-0.03em', color: COLORS.text }}>
                {COPY.brand}
              </span>
            </div>
            <div
              style={{
                marginTop: 30,
                fontFamily: MONO,
                fontWeight: 500,
                fontSize: 30,
                letterSpacing: '0.16em',
                color: COLORS.text,
                opacity: slate2,
                transform: `translateY(${(1 - slate2) * 12}px)`,
              }}
            >
              {COPY.tagline}
            </div>
            <div style={{ marginTop: 34, fontFamily: MONO, fontSize: 20, letterSpacing: '0.04em', color: COLORS.dim, opacity: slate2 }}>
              {COPY.url}
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* Music under everything, ducked under speech */}
      {present.music && <Audio src={staticFile(FILES.music.file)} volume={musicVolume} />}

      {/* Sound design: whoosh into each flight, chime on each landing, a swish on the whip-pan */}
      {[T.collapse1, T.collapse2].map((s) => (
        <Sequence key={`w${s}`} from={f(s - 0.05)} durationInFrames={f(1.7)}>
          <Audio src={staticFile('sfx/whoosh.wav')} volume={0.4} />
        </Sequence>
      ))}
      {[T.land1, T.land2].map((s) => (
        <Sequence key={`c${s}`} from={f(s - 0.02)} durationInFrames={f(2.2)}>
          <Audio src={staticFile('sfx/chime.wav')} volume={0.32} />
        </Sequence>
      ))}
      <Sequence from={f(T.whip - 0.1)} durationInFrames={f(1.0)}>
        <Audio src={staticFile('sfx/whoosh.wav')} volume={0.25} playbackRate={1.8} />
      </Sequence>
    </AbsoluteFill>
  );
}
