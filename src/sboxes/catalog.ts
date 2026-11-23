import { gfInv, gfMul, makeField } from '../gf/gf2n';
import { validateSBox, type SBox } from '../boolean/types';
import { aesSBoxTable, checkAgainstFips197 } from './aes';

/** GF(2^5) with x^5 + x^2 + 1, and GF(2^4) with x^4 + x + 1. */
export const GF32 = makeField(5, 0x25);
export const GF16 = makeField(4, 0x13);

export function goldCubeTable(): number[] {
  const t: number[] = [];
  for (let x = 0; x < 32; x++) t.push(gfMul(GF32, gfMul(GF32, x, x), x));
  return t;
}

export function inverse4Table(): number[] {
  const t: number[] = [];
  for (let x = 0; x < 16; x++) t.push(gfInv(GF16, x));
  return t;
}

/** f(x1, x2, x3, x4) = x1x2 ⊕ x3x4, with x1 the least significant input bit. */
export function bentTable(): number[] {
  const t: number[] = [];
  for (let x = 0; x < 16; x++) {
    const b = (k: number) => (x >> k) & 1;
    t.push((b(0) & b(1)) ^ (b(2) & b(3)));
  }
  return t;
}

/**
 * The editable starting point: an AFFINE 4-bit map, S(x) = rotl(x, 1) ⊕ 0x3.
 * Rotation is linear over GF(2), so every metric here is as bad as it can be —
 * which is the point of starting the editor from it.
 */
export function affineStartTable(): number[] {
  const t: number[] = [];
  for (let x = 0; x < 16; x++) t.push((((x << 1) | (x >> 3)) & 0xf) ^ 0x3);
  return t;
}

export function builtInSBoxes(): SBox[] {
  const aes = aesSBoxTable();
  if (!checkAgainstFips197(aes)) {
    throw new Error('generated AES S-box disagrees with FIPS 197; refusing to use it');
  }
  return [
    validateSBox('aes', 'AES S-box (8 → 8)', 8, 8, aes),
    validateSBox('bent', 'Bent function x1x2 ⊕ x3x4 (4 → 1)', 4, 1, bentTable()),
    validateSBox('gold', 'Gold map x³ over GF(2⁵) (5 → 5)', 5, 5, goldCubeTable()),
    validateSBox('inv4', 'Inversion over GF(2⁴) (4 → 4)', 4, 4, inverse4Table()),
  ];
}

/** Parse "0x3, 6, c …" or "3 6 c …" (hex, one entry per token) into a table. */
export function parseTable(text: string): number[] {
  const tokens = text
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  return tokens.map((tok, i) => {
    const clean = tok.replace(/^0x/i, '');
    if (!/^[0-9a-f]+$/i.test(clean)) throw new Error(`entry ${i} "${tok}" is not hexadecimal`);
    return parseInt(clean, 16);
  });
}

export function formatTable(table: readonly number[], width: number): string {
  return table.map((v) => v.toString(16).padStart(width, '0')).join(' ');
}
