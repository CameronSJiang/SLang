/**
 * Globe geometry, matching three-globe (and the SLang website): radius-100 sphere rotated
 * -90° on Y, lat/lng → xyz via polar coordinates, arcs as the same cubic Bézier.
 */
export const GLOBE_R = 100;
const D2R = Math.PI / 180;

export type Vec3 = [number, number, number];

export function toXYZ(lat: number, lng: number, alt = 0): Vec3 {
  const phi = (90 - lat) * D2R;
  const theta = (90 - lng) * D2R;
  const r = GLOBE_R * (1 + alt);
  return [r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)];
}

const unit = (v: Vec3): Vec3 => {
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
};
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  const omega = Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
  if (omega < 1e-6) return a;
  const s = Math.sin(omega);
  const k0 = Math.sin((1 - t) * omega) / s;
  const k1 = Math.sin(t * omega) / s;
  return [a[0] * k0 + b[0] * k1, a[1] * k0 + b[1] * k1, a[2] * k0 + b[2] * k1];
}

/** three-globe's arc: altitude = half the great-circle angle × autoscale, control points at ¼ and ¾. */
export function arcCurve(from: { lat: number; lng: number }, to: { lat: number; lng: number }, autoScale = 0.42) {
  const a = unit(toXYZ(from.lat, from.lng));
  const b = unit(toXYZ(to.lat, to.lng));
  const omega = Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
  const cpR = GLOBE_R * (1 + (omega / 2) * autoScale * 1.5);
  const p0: Vec3 = [a[0] * GLOBE_R, a[1] * GLOBE_R, a[2] * GLOBE_R];
  const p3: Vec3 = [b[0] * GLOBE_R, b[1] * GLOBE_R, b[2] * GLOBE_R];
  const m1 = slerp(a, b, 0.25);
  const m2 = slerp(a, b, 0.75);
  const p1: Vec3 = [m1[0] * cpR, m1[1] * cpR, m1[2] * cpR];
  const p2: Vec3 = [m2[0] * cpR, m2[1] * cpR, m2[2] * cpR];
  return (t: number): Vec3 => {
    const u = 1 - t;
    const c0 = u * u * u;
    const c1 = 3 * u * u * t;
    const c2 = 3 * u * t * t;
    const c3 = t * t * t;
    return [0, 1, 2].map((i) => c0 * p0[i] + c1 * p1[i] + c2 * p2[i] + c3 * p3[i]) as Vec3;
  };
}

/** 0..1: how visible a point is to a camera at `cam` (fades past the Earth's limb). */
export function limbVisibility(p: Vec3, cam: Vec3): number {
  const pLen = Math.hypot(...p);
  const cLen = Math.hypot(...cam);
  const cosAngle = dot(p, cam) / (pLen * cLen);
  const limit = Math.cos(Math.acos(Math.min(1, GLOBE_R / cLen)) + Math.acos(Math.min(1, GLOBE_R / pLen)));
  const x = Math.min(1, Math.max(0, (cosAngle - (limit - 0.02)) / 0.14));
  return x * x * (3 - 2 * x);
}
