/**
 * One continuous camera move for the globe acts. Both the WebGL scene and the HTML overlay
 * (phrase, pulses, labels) read this, so text stays locked to the 3D arc.
 */
import { Easing, interpolate } from 'remotion';
import { PerspectiveCamera, Vector3 } from 'three';
import { HEIGHT, ROUTE, TIMELINE, WIDTH, f } from '../config';
import { toXYZ, type Vec3 } from './geo';

export const FOV = 32;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const glide = Easing.bezier(0.65, 0, 0.35, 1);

export interface CameraState {
  position: Vec3;
  target: Vec3;
}

/** Point the camera at lat/lng from `dist` units away from the globe centre. */
function orbit(lat: number, lng: number, dist: number): Vec3 {
  return toXYZ(lat, lng, dist / 100 - 1);
}

export function cameraAt(frame: number): CameraState {
  const T = TIMELINE;
  // Act 2: glide in from far away, centred between the two cities, with a slow drift.
  const inP = interpolate(frame, [f(T.globeIn), f(T.arcStart + 0.6)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });
  const midLng = (ROUTE.from.lng + ROUTE.to.lng) / 2;
  const drift = interpolate(frame, [f(T.globeIn), f(T.dubZoom)], [-14, 4], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  let lat = interpolate(inP, [0, 1], [18, 36]);
  let lng = midLng + drift;
  let dist = interpolate(inP, [0, 1], [1150, 380]);
  let target: Vec3 = [0, 0, 0];

  // Act 3: dive toward the destination city.
  const dive = interpolate(frame, [f(T.dubZoom), f(T.dubStart + 0.7)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: glide,
  });
  if (dive > 0) {
    lat = interpolate(dive, [0, 1], [lat, ROUTE.to.lat]);
    lng = interpolate(dive, [0, 1], [lng, ROUTE.to.lng]);
    dist = interpolate(dive, [0, 1], [dist, 118]);
    const dest = toXYZ(ROUTE.to.lat, ROUTE.to.lng);
    target = [dest[0] * dive, dest[1] * dive, dest[2] * dive];
  }
  return { position: orbit(lat, lng, dist), target };
}

const scratch = new PerspectiveCamera(FOV, WIDTH / HEIGHT, 1, 5000);
const v = new Vector3();

/** Screen position (px) of a world point for the camera at `frame`. */
export function project(p: Vec3, cam: CameraState): { x: number; y: number; behind: boolean } {
  scratch.position.set(...cam.position);
  scratch.lookAt(...cam.target);
  scratch.updateMatrixWorld();
  v.set(...p).project(scratch);
  return { x: ((v.x + 1) / 2) * WIDTH, y: ((1 - v.y) / 2) * HEIGHT, behind: v.z > 1 };
}
