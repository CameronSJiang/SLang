import { describe, expect, it } from 'vitest';
import { numberToSpanish, phonemizeSpanish } from '../src/core/g2p/es';

const p = (s: string, v?: 'es' | 'es-419') => phonemizeSpanish(s, v);

describe('phonemizeSpanish', () => {
  it('handles a simple sentence with stress and allophones', () => {
    expect(p('Hoy vamos a la playa.')).toBe('ˈoi bˈamos a la plˈaʝa.');
    expect(p('Nada, todo bien.')).toBe('nˈaða, tˈoðo bjˈen.');
  });

  it('places stress by the written accent or the default rules', () => {
    expect(p('canción')).toBe('kanθjˈon');
    expect(p('árbol')).toBe('ˈaɾβol');
    expect(p('ciudad')).toBe('θjuðˈað');
    expect(p('hablar')).toBe('aβlˈaɾ');
  });

  it('spells out the tricky consonants', () => {
    expect(p('chico')).toBe('ʧˈiko');
    expect(p('perro pero')).toBe('pˈero peɾo'); // trilled vs tapped r; "pero" unstressed
    expect(p('guerra')).toBe('ɡˈera');
    expect(p('pingüino')).toBe('piŋɡwˈino');
    expect(p('gente')).toBe('xˈente');
    expect(p('niño')).toBe('nˈiɲo');
    expect(p('querido')).toBe('keɾˈiðo');
    expect(p('rato')).toBe('rˈato');
    expect(p('invierno')).toBe('imbjˈeɾno');
  });

  it('supports Latin American seseo', () => {
    expect(p('cerveza', 'es-419')).toBe('seɾβˈesa');
    expect(p('cerveza', 'es')).toBe('θeɾβˈeθa');
  });

  it('drops ¿ ¡ and reads numbers', () => {
    expect(p('¿Qué tal? ¡Muy bien!')).toBe('kˈe tˈal? mwˈi bjˈen!');
    expect(p('Tengo 21 años')).toBe(`tˈeŋɡo ${p('veintiuno')} ˈaɲos`);
  });
});

describe('numberToSpanish', () => {
  it('reads common numbers', () => {
    expect(numberToSpanish(7)).toBe('siete');
    expect(numberToSpanish(45)).toBe('cuarenta y cinco');
    expect(numberToSpanish(100)).toBe('cien');
    expect(numberToSpanish(115)).toBe('ciento quince');
    expect(numberToSpanish(2026)).toBe('dos mil veintiséis');
  });
});
