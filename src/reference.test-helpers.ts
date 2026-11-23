/**
 * Independent reference routes, written separately from src/boolean/*.ts so a
 * test never agrees with a bug by recomputing the same expression the source
 * uses (§4.1b). Each one takes the slow, definitional path.
 */
const par = (v: number): number => {
  let p = 0;
  for (let x = v; x; x >>= 1) p ^= x & 1;
  return p;
};
const pop = (v: number): number => {
  let c = 0;
  for (let x = v; x; x >>= 1) c += x & 1;
  return c;
};

/** NL by direct correlation sums, no butterfly: min over b ≠ 0 of 2^(n−1) − max_a |Σ_x (−1)^(b·S(x) ⊕ a·x)| / 2. */
export function refNonlinearity(table: readonly number[], n: number, m: number): number {
  let best = Infinity;
  for (let b = 1; b < 1 << m; b++) {
    let max = 0;
    for (let a = 0; a < 1 << n; a++) {
      let sum = 0;
      for (let x = 0; x < 1 << n; x++) sum += par(b & table[x]) === par(a & x) ? 1 : -1;
      max = Math.max(max, Math.abs(sum));
    }
    best = Math.min(best, 2 ** (n - 1) - max / 2);
  }
  return best;
}

/** δ by explicit counting over every (a, b) pair. */
export function refDelta(table: readonly number[], n: number, m: number): number {
  let best = 0;
  for (let a = 1; a < 1 << n; a++) {
    for (let b = 0; b < 1 << m; b++) {
      let c = 0;
      for (let x = 0; x < 1 << n; x++) if ((table[x] ^ table[x ^ a]) === b) c++;
      best = Math.max(best, c);
    }
  }
  return best;
}

/** Degree from the ANF definition a_u = XOR over x ⊆ u of f(x), computed naively per u. */
export function refDegree(table: readonly number[], n: number, m: number): number {
  let deg = -1;
  for (let i = 0; i < m; i++) {
    for (let u = 0; u < 1 << n; u++) {
      let a = 0;
      for (let x = 0; x < 1 << n; x++) if ((x & u) === x) a ^= (table[x] >> i) & 1;
      if (a && pop(u) > deg) deg = pop(u);
    }
  }
  return deg;
}

/** The AES S-box from FIPS 197 Figure 7, first row only — a published vector, not a computation. */
export const FIPS197_ROW0 = [
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
];
