/**
 * Globe camera for both flights. The WebGL scene and the HTML overlay (dots, label, pulses)
 * read the same function, so everything stays locked to the arcs.
 */
import { Easing, interpolate } from 'remotion';
import { PerspectiveCamera, Vector3 } from 'three';
import { CITIES, HEIGHT, T, WIDTH, f } from '../config';
import { toXYZ, type Vec3 } from './geo';

export const FOV = 32;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export interface CameraState {
  position: Vec3;
  target: Vec3;
}

const MID_LNG = (CITIES.newYork.lng + CITIES.madrid.lng) / 2;

/** One flight's camera: settles in as the card collapses, drifts slowly, leans to the destination. */
function flightCam(frame: number, collapse: number, land: number, expand: number, dir: 1 | -1) {
  const settle = interpolate(frame, [f(collapse), f(collapse + 0.9)], [0, 1], { ...clamp, easing: ease });
  const drift = interpolate(frame, [f(collapse), f(expand + 0.8)], [-9 * dir, 7 * dir], clamp);
  const lean = interpolate(frame, [f(land - 0.4), f(expand + 0.6)], [0, 1], { ...clamp, easing: ease });
  const lat = interpolate(settle, [0, 1], [30, 37]);
  const lng = MID_LNG + drift + lean * 10 * dir;
  const dist = interpolate(settle, [0, 1], [470, 380]) - lean * 40;
  return { lat, lng, dist };
}

export function cameraAt(frame: number): CameraState {
  const second = frame >= f((T.expand1 + T.collapse2) / 2);
  const c = second
    ? flightCam(frame, T.collapse2, T.land2, T.expand2, -1)
    : flightCam(frame, T.collapse1, T.land1, T.expand1, 1);
  return { position: toXYZ(c.lat, c.lng, c.dist / 100 - 1), target: [0, 0, 0] };
}

const scratch = new PerspectiveCamera(FOV, WIDTH / HEIGHT, 1, 5000);
const v = new Vector3();

/** Screen position (px) of a world point. */
export function project(p: Vec3, cam: CameraState): { x: number; y: number } {
  scratch.position.set(...cam.position);
  scratch.lookAt(...cam.target);
  scratch.updateMatrixWorld();
  v.set(...p).project(scratch);
  return { x: ((v.x + 1) / 2) * WIDTH, y: ((1 - v.y) / 2) * HEIGHT };
}

/** Screen position of a city at `frame`. */
export function cityOnScreen(city: { lat: number; lng: number }, frame: number) {
  return project(toXYZ(city.lat, city.lng, 0.004), cameraAt(frame));
}
