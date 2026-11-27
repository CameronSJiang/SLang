import { useThree } from '@react-three/fiber';
import { ThreeCanvas } from '@remotion/three';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from 'remotion';
import {
  AdditiveBlending,
  BackSide,
  CatmullRomCurve3,
  Color,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  TubeGeometry,
  Vector3,
} from 'three';
import { CITIES, COLORS, FLIGHTS, HEIGHT, WIDTH, f } from '../config';
import { FOV, cameraAt } from '../lib/camera';
import { GLOBE_R, arcCurve, toXYZ, type Vec3 } from '../lib/geo';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const flightCurves = FLIGHTS.map((fl) => arcCurve(fl.from, fl.to));
const TRAIL_FADE_S = 0.9;

/** Where the trail of flight i is drawn this frame: [t0, t1] along the arc, and opacity. */
export function trailState(i: number, frame: number): { t0: number; t1: number; alpha: number } | null {
  const fl = FLIGHTS[i];
  if (!fl) return null;
  const t1 = interpolate(frame, [f(fl.start), f(fl.land)], [0, 1], clamp);
  if (t1 <= 0) return null;
  const k = interpolate(frame, [f(fl.land), f(fl.land + TRAIL_FADE_S)], [0, 1], clamp);
  if (k >= 1) return null;
  return { t0: k * k, t1, alpha: 1 - k };
}

function CameraRig() {
  const frame = useCurrentFrame();
  const { camera } = useThree();
  useLayoutEffect(() => {
    const c = cameraAt(frame);
    camera.position.set(...c.position);
    camera.lookAt(...c.target);
    camera.updateProjectionMatrix();
  }, [frame, camera]);
  return null;
}

function useEarthTexture(): Texture | null {
  const [tex, setTex] = useState<Texture | null>(null);
  const [handle] = useState(() => delayRender('Loading Earth texture'));
  useEffect(() => {
    new TextureLoader().load(
      staticFile('earth-night.jpg'),
      (t) => {
        t.colorSpace = SRGBColorSpace;
        t.anisotropy = 8;
        setTex(t);
        continueRender(handle);
      },
      undefined,
      () => continueRender(handle),
    );
  }, [handle]);
  return tex;
}

const atmosphereShader = {
  uniforms: { glow: { value: new Color(COLORS.cobalt) } },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vView = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    uniform vec3 glow;
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
      float rim = pow(1.0 - abs(dot(vNormal, vView)), 4.5);
      gl_FragColor = vec4(glow, rim * 0.3);
    }`,
};

function Trail({ curve, t0, t1, alpha }: { curve: (t: number) => Vec3; t0: number; t1: number; alpha: number }) {
  const geos = useMemo(() => {
    if (t1 - t0 < 0.003) return null;
    const n = Math.max(4, Math.ceil(80 * (t1 - t0)));
    const pts: Vector3[] = [];
    for (let i = 0; i <= n; i++) pts.push(new Vector3(...curve(t0 + ((t1 - t0) * i) / n)));
    const path = new CatmullRomCurve3(pts);
    return {
      core: new TubeGeometry(path, n * 2, 0.32, 8, false),
      glow: new TubeGeometry(path, n * 2, 1.15, 8, false),
    };
  }, [curve, t0, t1]);
  useEffect(
    () => () => {
      geos?.core.dispose();
      geos?.glow.dispose();
    },
    [geos],
  );
  if (!geos) return null;
  return (
    <group>
      <mesh geometry={geos.glow}>
        <meshBasicMaterial color={COLORS.accent} transparent opacity={0.17 * alpha} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh geometry={geos.core}>
        <meshBasicMaterial color={COLORS.accent} transparent opacity={0.95 * alpha} />
      </mesh>
    </group>
  );
}

function City({ lat, lng }: { lat: number; lng: number }) {
  return (
    <mesh position={toXYZ(lat, lng, 0.004)}>
      <sphereGeometry args={[0.8, 16, 16]} />
      <meshBasicMaterial color={COLORS.accent} />
    </mesh>
  );
}

export function Globe3D({ opacity }: { opacity: number }) {
  const frame = useCurrentFrame();
  const tex = useEarthTexture();
  return (
    <div style={{ position: 'absolute', inset: 0, opacity }}>
      <ThreeCanvas width={WIDTH} height={HEIGHT} camera={{ fov: FOV, near: 1, far: 5000 }} gl={{ antialias: true, alpha: true }}>
        <CameraRig />
        <ambientLight intensity={0.25} />
        <mesh rotation={[0, -Math.PI / 2, 0]}>
          <sphereGeometry args={[GLOBE_R, 96, 64]} />
          {tex ? (
            <meshStandardMaterial color="#0b0f1a" emissive="#ffffff" emissiveMap={tex} emissiveIntensity={1.25} roughness={1} metalness={0} />
          ) : (
            <meshBasicMaterial color="#0b0f1a" />
          )}
        </mesh>
        <mesh scale={1.06}>
          <sphereGeometry args={[GLOBE_R, 64, 48]} />
          <shaderMaterial args={[atmosphereShader]} side={BackSide} transparent blending={AdditiveBlending} depthWrite={false} />
        </mesh>
        <City {...CITIES.newYork} />
        <City {...CITIES.madrid} />
        {flightCurves.map((curve, i) => {
          const s = trailState(i, frame);
          return s ? <Trail key={i} curve={curve} {...s} /> : null;
        })}
      </ThreeCanvas>
    </div>
  );
}
