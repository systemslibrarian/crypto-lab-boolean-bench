/**
 * Arithmetic in GF(2^n), elements as integers 0 … 2^n − 1 (bit i = coefficient of x^i).
 *
 * `modulus` is the full reduction polynomial including the x^n term, e.g. 0x11B for
 * AES (x^8 + x^4 + x^3 + x + 1, FIPS 197 §4.2) or 0x25 for x^5 + x^2 + 1.
 * Hand-rolled on purpose: the field arithmetic is the inspectable part of every
 * S-box on this page.
 */
export interface Field {
  readonly n: number;
  readonly modulus: number;
}

export function makeField(n: number, modulus: number): Field {
  if (!Number.isInteger(n) || n < 1 || n > 16) throw new RangeError(`field degree ${n} out of range`);
  if (modulus >> n !== 1) throw new RangeError(`modulus 0x${modulus.toString(16)} is not of degree ${n}`);
  return { n, modulus };
}

/** Shift-and-add multiplication, reducing whenever the x^n bit appears. */
export function gfMul(f: Field, a: number, b: number): number {
  const top = 1 << f.n;
  let r = 0;
  let x = a;
  let y = b;
  while (y) {
    if (y & 1) r ^= x;
    y >>>= 1;
    x <<= 1;
    if (x & top) x ^= f.modulus;
  }
  return r;
}

export function gfPow(f: Field, a: number, e: number): number {
  let r = 1;
  let base = a;
  let k = e;
  while (k > 0) {
    if (k & 1) r = gfMul(f, r, base);
    base = gfMul(f, base, base);
    k = Math.floor(k / 2);
  }
  return r;
}

/** Multiplicative inverse a^(2^n − 2); maps 0 to 0, the convention AES uses. */
export function gfInv(f: Field, a: number): number {
  if (a === 0) return 0;
  return gfPow(f, a, (1 << f.n) - 2);
}
