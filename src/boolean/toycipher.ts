import type { SBox } from './types';

/**
 * A "cipher" made of nothing but the S-box: c = S(p ⊕ k).
 * It exists to make the negative claim a result, not a disclaimer — an S-box
 * with optimal nonlinearity and differential uniformity, used alone, falls to
 * ONE known plaintext/ciphertext pair: k = S⁻¹(c) ⊕ p.
 */
export function encryptToy(s: SBox, key: number, p: number): number {
  return s.table[p ^ key];
}

export function invert(s: SBox): number[] {
  if (s.n !== s.m) throw new Error('only an n → n S-box can be inverted');
  const inv = new Array<number>(1 << s.n).fill(-1);
  s.table.forEach((y, x) => {
    if (inv[y] !== -1) throw new Error('not a permutation: no inverse exists');
    inv[y] = x;
  });
  return inv;
}

export function recoverKey(s: SBox, p: number, c: number): number {
  return invert(s)[c] ^ p;
}
