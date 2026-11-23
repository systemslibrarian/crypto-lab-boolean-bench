import { gfInv, makeField } from '../gf/gf2n';

/** GF(2^8) with the AES modulus x^8 + x^4 + x^3 + x + 1 (FIPS 197 §4.2). */
export const AES_FIELD = makeField(8, 0x11b);

/** The affine constant c = 0x63 of FIPS 197 §5.1.1. */
export const AES_AFFINE_CONSTANT = 0x63;

/**
 * FIPS 197 §5.1.1 affine map: b'_i = b_i ⊕ b_(i+4) ⊕ b_(i+5) ⊕ b_(i+6) ⊕ b_(i+7) ⊕ c_i,
 * indices mod 8.
 */
export function aesAffine(b: number, c = AES_AFFINE_CONSTANT): number {
  let out = 0;
  for (let i = 0; i < 8; i++) {
    const bit =
      ((b >> i) ^ (b >> ((i + 4) % 8)) ^ (b >> ((i + 5) % 8)) ^ (b >> ((i + 6) % 8)) ^ (b >> ((i + 7) % 8)) ^ (c >> i)) & 1;
    out |= bit << i;
  }
  return out;
}

/** The AES S-box generated from its definition: multiplicative inverse, then the affine map. */
export function aesSBoxTable(): number[] {
  const t: number[] = [];
  for (let x = 0; x < 256; x++) t.push(aesAffine(gfInv(AES_FIELD, x)));
  return t;
}

/** FIPS 197 values checked before the table is used (Figure 7 entries and §5.1.1's {53} → {ed}). */
export const FIPS197_SPOT_CHECKS: ReadonlyArray<readonly [number, number]> = [
  [0x00, 0x63],
  [0x01, 0x7c],
  [0x53, 0xed],
];

export function checkAgainstFips197(table: readonly number[]): boolean {
  return FIPS197_SPOT_CHECKS.every(([x, y]) => table[x] === y);
}
