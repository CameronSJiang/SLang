/**
 * Character-by-character translation morph (same as the SLang website): 0–20% source,
 * 20–80% each column steps through the alphabet toward its target, 80–100% target.
 */
const ALPHA = 'abcdefghijklmnopqrstuvwxyz';
const plain = (c: string) => c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function column(from: string, to: string, p: number): string {
  if (p <= 0) return from;
  if (p >= 1) return to;
  const a = ALPHA.indexOf(plain(from));
  const b = ALPHA.indexOf(plain(to));
  if (a < 0 || b < 0) return p < 0.5 ? from : to;
  let d = b - a;
  if (d > 13) d -= 26;
  if (d < -13) d += 26;
  const k = Math.round(p * Math.abs(d));
  const ch = ALPHA[(a + Math.sign(d) * k + 26) % 26] ?? to;
  // keep the source's capitalisation while stepping
  return from === from.toUpperCase() && from !== from.toLowerCase() ? ch.toUpperCase() : ch;
}

export function morph(src: string, dst: string, t: number): string {
  if (t <= 0.2) return src;
  if (t >= 0.8) return dst;
  const p = (t - 0.2) / 0.6;
  const n = Math.max(src.length, dst.length);
  const a = src.padEnd(n, ' ');
  const b = dst.padEnd(n, ' ');
  const w = 0.45;
  let out = '';
  for (let i = 0; i < n; i++) {
    const start = (i / Math.max(1, n - 1)) * (1 - w);
    out += column(a[i] ?? ' ', b[i] ?? ' ', (p - start) / w);
  }
  return out.replace(/\s+$/, '');
}
