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
import { COLORS, HEIGHT, ROUTE, TIMELINE, WIDTH, f } from '../config';
import { FOV, cameraAt } from '../lib/camera';
import { GLOBE_R, arcCurve, toXYZ } from '../lib/geo';

const curve = arcCurve(ROUTE.from, ROUTE.to);

/** Arc progress 0..1 for a frame (draw-on while the phrase flies). */
export function arcProgress(frame: number): number {
  return interpolate(frame, [f(TIMELINE.arcStart), f(TIMELINE.arcLand)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
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

function Arc({ progress, fade }: { progress: number; fade: number }) {
  const geos = useMemo(() => {
    if (progress <= 0.002) return null;
    const n = Math.max(4, Math.ceil(80 * progress));
    const pts: Vector3[] = [];
    for (let i = 0; i <= n; i++) pts.push(new Vector3(...curve((progress * i) / n)));
    const path = new CatmullRomCurve3(pts);
    return {
      core: new TubeGeometry(path, n * 2, 0.32, 8, false),
      glow: new TubeGeometry(path, n * 2, 1.1, 8, false),
    };
  }, [progress]);
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
        <meshBasicMaterial
          color={COLORS.accent}
          transparent
          opacity={0.16 * fade}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh geometry={geos.core}>
        <meshBasicMaterial color={COLORS.accent} transparent opacity={0.95 * fade} />
      </mesh>
    </group>
  );
}

function City({ lat, lng }: { lat: number; lng: number }) {
  const p = toXYZ(lat, lng, 0.004);
  return (
    <mesh position={p}>
      <sphereGeometry args={[0.85, 16, 16]} />
      <meshBasicMaterial color={COLORS.accent} />
    </mesh>
  );
}

export function Globe3D({ opacity }: { opacity: number }) {
  const frame = useCurrentFrame();
  const tex = useEarthTexture();
  const progress = arcProgress(frame);
  // After the dive starts, the trail dissolves so the dubbed clip takes over cleanly.
  const trailFade = interpolate(frame, [f(TIMELINE.dubZoom), f(TIMELINE.dubZoom + 0.6)], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ position: 'absolute', inset: 0, opacity }}>
      <ThreeCanvas width={WIDTH} height={HEIGHT} camera={{ fov: FOV, near: 1, far: 5000 }} gl={{ antialias: true, alpha: true }}>
        <CameraRig />
        <ambientLight intensity={0.25} />
        <mesh rotation={[0, -Math.PI / 2, 0]}>
          <sphereGeometry args={[GLOBE_R, 96, 64]} />
          {tex ? (
            <meshStandardMaterial
              color="#0b0f1a"
              emissive="#ffffff"
              emissiveMap={tex}
              emissiveIntensity={1.25}
              roughness={1}
              metalness={0}
            />
          ) : (
            <meshBasicMaterial color="#0b0f1a" />
          )}
        </mesh>
        <mesh scale={1.06}>
          <sphereGeometry args={[GLOBE_R, 64, 48]} />
          <shaderMaterial
            args={[atmosphereShader]}
            side={BackSide}
            transparent
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <City lat={ROUTE.from.lat} lng={ROUTE.from.lng} />
        <City lat={ROUTE.to.lat} lng={ROUTE.to.lng} />
        <Arc progress={progress} fade={trailFade} />
      </ThreeCanvas>
    </div>
  );
}

export { curve as routeCurve };
