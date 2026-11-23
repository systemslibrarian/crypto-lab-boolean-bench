import type { SBox } from './types';

/** One row of the difference distribution table: counts of S(x) ⊕ S(x ⊕ a) = b, for each b. */
export function ddtRow(s: SBox, a: number): Uint16Array {
  const row = new Uint16Array(1 << s.m);
  for (let x = 0; x < 1 << s.n; x++) row[s.table[x] ^ s.table[x ^ a]]++;
  return row;
}

/**
 * Differential uniformity δ(S) = max over a ≠ 0 and all b of DDT[a][b].
 * Row a = 0 is excluded: it always puts every x in column 0.
 */
export function differentialUniformity(s: SBox): { delta: number; a: number; b: number } {
  let best = { delta: -1, a: 1, b: 0 };
  for (let a = 1; a < 1 << s.n; a++) {
    const row = ddtRow(s, a);
    for (let b = 0; b < row.length; b++) {
      if (row[b] > best.delta) best = { delta: row[b], a, b };
    }
  }
  return best;
}

/** Every x that realises the transition a → b (the "pairs" behind one DDT cell). */
export function pairsFor(s: SBox, a: number, b: number): number[] {
  const out: number[] = [];
  for (let x = 0; x < 1 << s.n; x++) if ((s.table[x] ^ s.table[x ^ a]) === b) out.push(x);
  return out;
}
