/**
 * Spanish grapheme → phoneme rules producing espeak-style IPA in Kokoro's
 * symbol set (stress mark before the stressed vowel). Spanish spelling is
 * regular enough that rules beat shipping a phonemizer. Pure.
 */

export type SpanishVariant = 'es' | 'es-419';

const VOWELS = 'aeiouáéíóúü';
const ACCENTED: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u' };
const FRONT = 'eiéí';

/** Unstressed function words (clitics, articles, short prepositions/conjunctions). */
const UNSTRESSED = new Set(
  'a al de del el la las lo los un una unos unas y e o u que en con por para se me te le les nos os mi mis tu tus su sus si sin ni pero como cuando donde mas'.split(
    ' ',
  ),
);

interface Seg {
  ph: string;
  vowel: boolean;
  /** i/u without accent: can become a glide. */
  weak?: boolean;
  accent?: boolean;
  /** Placeholder consonant whose realization depends on context (B/D/G). */
  soft?: 'B' | 'D' | 'G';
}

const isVowel = (c: string | undefined) => !!c && VOWELS.includes(c);

function segments(w: string, variant: SpanishVariant): Seg[] {
  const out: Seg[] = [];
  const theta = variant === 'es' ? 'θ' : 's';
  for (let i = 0; i < w.length; i++) {
    const c = w[i] as string;
    const n = w[i + 1];
    const n2 = w[i + 2];
    const cons = (ph: string) => out.push({ ph, vowel: false });
    if (isVowel(c)) {
      const base = ACCENTED[c] ?? c;
      const accent = c in ACCENTED && c !== 'ü';
      out.push({ ph: base, vowel: true, weak: (base === 'i' || base === 'u') && !accent, accent });
      continue;
    }
    switch (c) {
      case 'c':
        if (n === 'h') {
          cons('ʧ');
          i++;
        } else cons(n && FRONT.includes(n) ? theta : 'k');
        break;
      case 'l':
        if (n === 'l') {
          cons('ʝ');
          i++;
        } else cons('l');
        break;
      case 'r':
        if (n === 'r') {
          cons('r');
          i++;
        } else {
          const prev = out[out.length - 1]?.ph;
          cons(i === 0 || prev === 'n' || prev === 'l' || prev === 's' ? 'r' : 'ɾ');
        }
        break;
      case 'q':
        cons('k');
        if (n === 'u') i++; // "qu" = k
        break;
      case 'g':
        if (n === 'u' && n2 && FRONT.includes(n2)) {
          out.push({ ph: 'ɡ', vowel: false, soft: 'G' });
          i++; // silent u in gue/gui
        } else if (n === 'ü') {
          out.push({ ph: 'ɡ', vowel: false, soft: 'G' });
          cons('w');
          i++;
        } else if (n && FRONT.includes(n)) cons('x');
        else out.push({ ph: 'ɡ', vowel: false, soft: 'G' });
        break;
      case 'j':
        cons('x');
        break;
      case 'z':
        cons(theta);
        break;
      case 'ñ':
        cons('ɲ');
        break;
      case 'h':
        break; // silent
      case 'v':
      case 'b':
        out.push({ ph: 'b', vowel: false, soft: 'B' });
        break;
      case 'd':
        out.push({ ph: 'd', vowel: false, soft: 'D' });
        break;
      case 'x':
        cons('k');
        cons('s');
        break;
      case 'y':
        // Vowel at the end of a word or on its own ("hoy", "y"), consonant otherwise.
        if (!n || !isVowel(n)) out.push({ ph: 'i', vowel: true, weak: true });
        else cons('ʝ');
        break;
      case 'w':
        cons('w');
        break;
      case 'k':
        cons('k');
        break;
      default:
        if (/[a-zñ]/.test(c)) cons(c);
    }
  }
  return out;
}

/** Realize B/D/G (stops vs. approximants), glides, nasal place, and stress for one word. */
function realize(segs: Seg[], stressed: boolean): string {
  // Glides: unaccented i/u before another vowel lose syllabicity (bien → bjen, muy → mwi).
  segs.forEach((s, k) => {
    if (s.vowel && s.weak && segs[k + 1]?.vowel) {
      s.vowel = false;
      s.ph = s.ph === 'i' ? 'j' : 'w';
    }
  });
  // Syllable nuclei: vowels that don't follow another vowel as the weak half of a falling diphthong.
  const nuclei: number[] = [];
  segs.forEach((s, k) => {
    if (!s.vowel) return;
    const prev = segs[k - 1];
    if (s.weak && prev?.vowel) return; // "ai", "ei", "oi", "au"
    nuclei.push(k);
  });

  let stressAt = -1;
  if (stressed && nuclei.length) {
    const accented = nuclei.find((k) => segs[k]?.accent);
    if (accented !== undefined) stressAt = accented;
    else {
      const last = segs[segs.length - 1];
      const endsSoft =
        !!last &&
        (last.vowel || last.ph === 'n' || last.ph === 's' || last.ph === 'j' || last.ph === 'w');
      stressAt = (
        nuclei.length >= 2 && endsSoft ? nuclei[nuclei.length - 2] : nuclei[nuclei.length - 1]
      ) as number;
    }
  }

  return segs
    .map((s, k) => {
      let ph = s.ph;
      const prev = segs[k - 1]?.ph;
      if (s.soft) {
        const stop = k === 0 || prev === 'm' || prev === 'n' || (s.soft === 'D' && prev === 'l');
        if (!stop) ph = s.soft === 'B' ? 'β' : s.soft === 'D' ? 'ð' : 'ɣ';
      }
      const next = segs[k + 1]?.ph;
      if (ph === 'n' && (next === 'b' || next === 'p' || next === 'm')) ph = 'm';
      if (ph === 'n' && (next === 'k' || next === 'ɡ' || next === 'x')) ph = 'ŋ';
      return (k === stressAt ? 'ˈ' : '') + ph;
    })
    .join('');
}

const ONES =
  'cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciséis diecisiete dieciocho diecinueve veinte veintiuno veintidós veintitrés veinticuatro veinticinco veintiséis veintisiete veintiocho veintinueve'.split(
    ' ',
  );
const TENS = [
  '',
  '',
  '',
  'treinta',
  'cuarenta',
  'cincuenta',
  'sesenta',
  'setenta',
  'ochenta',
  'noventa',
];
const HUNDREDS = [
  '',
  'ciento',
  'doscientos',
  'trescientos',
  'cuatrocientos',
  'quinientos',
  'seiscientos',
  'setecientos',
  'ochocientos',
  'novecientos',
];

/** Spanish words for 0–999999 (larger numbers are read digit by digit). */
export function numberToSpanish(n: number): string {
  if (n < 30) return ONES[n] as string;
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` y ${ONES[n % 10]}` : ''}`;
  if (n === 100) return 'cien';
  if (n < 1000)
    return `${HUNDREDS[Math.floor(n / 100)]}${n % 100 ? ` ${numberToSpanish(n % 100)}` : ''}`;
  if (n < 1_000_000) {
    const k = Math.floor(n / 1000);
    return `${k === 1 ? 'mil' : `${numberToSpanish(k)} mil`}${n % 1000 ? ` ${numberToSpanish(n % 1000)}` : ''}`;
  }
  return String(n)
    .split('')
    .map((d) => ONES[Number(d)])
    .join(' ');
}

/** Phonemize Spanish text for Kokoro. Punctuation Kokoro knows is kept; ¿ ¡ and quotes are dropped. */
export function phonemizeSpanish(text: string, variant: SpanishVariant = 'es'): string {
  const normalized = text
    .normalize('NFC')
    .toLocaleLowerCase('es')
    .replace(/\d+/g, (d) => ` ${numberToSpanish(Number(d))} `)
    .replace(/[¿¡«»"“”]/g, '')
    .replace(/[–—]/g, ',');
  const parts = normalized.match(/[a-záéíóúüñ]+|[.,!?;:…]+/g) ?? [];
  let out = '';
  for (const p of parts) {
    if (/^[.,!?;:…]+$/.test(p)) {
      out = out.trimEnd() + p + ' ';
      continue;
    }
    const segs = segments(p, variant);
    if (!segs.length) continue;
    const stressed = !UNSTRESSED.has(p) || segs.filter((s) => s.vowel).length === 0;
    out += realize(segs, stressed) + ' ';
  }
  return out.trim();
}
