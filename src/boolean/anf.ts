import { popcount, type SBox } from './types';

/**
 * Algebraic normal form of one coordinate function f_i(x) = bit i of S(x),
 * by the Möbius transform (butterfly over subsets): coef[u] = XOR of f(x) over x ⊆ u.
 */
export function anfCoordinate(s: SBox, i: number): Uint8Array {
  const size = 1 << s.n;
  const c = new Uint8Array(size);
  for (let x = 0; x < size; x++) c[x] = (s.table[x] >> i) & 1;
  for (let h = 1; h < size; h <<= 1) {
    for (let x = 0; x < size; x++) {
      if (x & h) c[x] ^= c[x ^ h];
    }
  }
  return c;
}

/** Degree of a function from its ANF: the largest weight of a monomial present (−∞ → −1 for f ≡ 0). */
export function degreeOf(anf: Uint8Array): number {
  let d = -1;
  for (let u = 0; u < anf.length; u++) if (anf[u] && popcount(u) > d) d = popcount(u);
  return d;
}

/** Algebraic degree of S: the maximum over its coordinate functions. */
export function algebraicDegree(s: SBox): { degree: number; perCoordinate: number[] } {
  const perCoordinate: number[] = [];
  for (let i = 0; i < s.m; i++) perCoordinate.push(degreeOf(anfCoordinate(s, i)));
  return { degree: Math.max(...perCoordinate), perCoordinate };
}

/** A monomial u written as x1x3x4 (x1 = least significant input bit), "1" for u = 0. */
export function monomialName(u: number): string {
  if (u === 0) return '1';
  let s = '';
  for (let k = 0; k < 16; k++) if ((u >> k) & 1) s += `x${k + 1}`;
  return s;
}
