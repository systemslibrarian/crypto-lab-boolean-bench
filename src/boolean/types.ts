/**
 * A vectorial Boolean function S: F_2^n → F_2^m stored as its lookup table.
 * table[x] is the m-bit output for the n-bit input x. A Boolean function is m = 1.
 */
export interface SBox {
  readonly id: string;
  readonly name: string;
  readonly n: number;
  readonly m: number;
  readonly table: readonly number[];
}

/** The largest input size the page will analyse; see `validateSBox`. */
export const MAX_N = 8;

export class SBoxError extends Error {}

/**
 * Fail closed on anything that is not a well-formed n-bit to m-bit table.
 * n > 8 is refused because a 2^n × 2^m difference table no longer fits the
 * browser budget this page promises (65,536 cells at n = m = 8 already).
 */
export function validateSBox(id: string, name: string, n: number, m: number, table: readonly number[]): SBox {
  if (!Number.isInteger(n) || n < 1) throw new SBoxError(`input size n = ${n} is not a positive integer`);
  if (n > MAX_N) {
    throw new SBoxError(
      `n = ${n} is refused: a 2^${n}-entry table and its 2^${n} × 2^${m} difference table exceed this page's in-browser budget (n ≤ ${MAX_N})`,
    );
  }
  if (!Number.isInteger(m) || m < 1 || m > MAX_N) throw new SBoxError(`output size m = ${m} must be 1 … ${MAX_N}`);
  if (table.length !== 1 << n) throw new SBoxError(`a ${n}-bit S-box needs ${1 << n} entries, got ${table.length}`);
  const lim = 1 << m;
  table.forEach((v, i) => {
    if (!Number.isInteger(v) || v < 0 || v >= lim) {
      throw new SBoxError(`entry ${i} = ${v} does not fit in ${m} bit${m === 1 ? '' : 's'}`);
    }
  });
  return { id, name, n, m, table: Object.freeze([...table]) };
}

/** Parity of the bits of v (the inner product a·x is parity(a & x)). */
export function parity(v: number): number {
  let p = 0;
  let x = v;
  while (x) {
    p ^= 1;
    x &= x - 1;
  }
  return p;
}

export function popcount(v: number): number {
  let c = 0;
  let x = v;
  while (x) {
    c++;
    x &= x - 1;
  }
  return c;
}

export function isPermutation(s: SBox): boolean {
  if (s.n !== s.m) return false;
  const seen = new Uint8Array(1 << s.n);
  for (const v of s.table) {
    if (seen[v]) return false;
    seen[v] = 1;
  }
  return true;
}

export function isConstant(s: SBox): boolean {
  return s.table.every((v) => v === s.table[0]);
}
