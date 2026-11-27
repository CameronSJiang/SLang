// Synthesizes the launch film's two sound cues as 48 kHz 16-bit WAVs (no samples, no deps):
//   public/sfx/whoosh.wav  soft sub-bass whoosh for the globe zoom
//   public/sfx/chime.wav   crisp harmonic chime when the translation locks in
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 48000;
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sfx');
mkdirSync(out, { recursive: true });

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

// Deterministic noise so renders are reproducible.
let seed = 7;
const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1;

// Whoosh: low sine gliding 70→38 Hz under band-limited noise that swells and passes.
function whoosh(seconds = 1.6) {
  const n = Math.round(seconds * RATE);
  const outS = new Float32Array(n);
  let phase = 0;
  let lp = 0;
  let lp2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const env = Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 2; // swell in, ease out
    const f = 70 - 32 * t;
    phase += (2 * Math.PI * f) / RATE;
    const sub = Math.sin(phase) * 0.55;
    // two one-pole low-passes with a moving cutoff give a soft "air" sweep
    const cutoff = 0.02 + 0.06 * Math.sin(Math.PI * t);
    lp += cutoff * (noise() - lp);
    lp2 += cutoff * (lp - lp2);
    outS[i] = env * (sub + lp2 * 2.2) * 0.7;
  }
  return outS;
}

// Chime: a few bell-like partials with fast attack and long exponential decay.
function chime(seconds = 2.2) {
  const n = Math.round(seconds * RATE);
  const outS = new Float32Array(n);
  const partials = [
    [1318.5, 0.5, 2.6], // E6
    [1975.5, 0.28, 3.4], // B6
    [2637.0, 0.16, 4.5], // E7
    [659.25, 0.22, 2.0], // E5 body
  ];
  for (let i = 0; i < n; i++) {
    const s = i / RATE;
    const attack = Math.min(1, s / 0.004);
    let v = 0;
    for (const [f, a, d] of partials) v += a * Math.exp(-d * s) * Math.sin(2 * Math.PI * f * s);
    outS[i] = attack * v * 0.6;
  }
  return outS;
}

writeFileSync(join(out, 'whoosh.wav'), wav(whoosh()));
writeFileSync(join(out, 'chime.wav'), wav(chime()));
console.log('Wrote public/sfx/whoosh.wav and public/sfx/chime.wav');
