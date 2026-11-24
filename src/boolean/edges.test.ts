import { describe, expect, it } from 'vitest';
import { affineStartTable, builtInSBoxes, parseTable } from '../sboxes/catalog';
import { refDelta, refNonlinearity } from '../reference.test-helpers';
import { analyse } from './metrics';
import { recoverKey, encryptToy, invert } from './toycipher';
import { SBoxError, validateSBox } from './types';

describe('F. Fail-closed edge cases', () => {
  it('both one-bit permutations have degree one and meet the stated upper bound', () => {
    for (const table of [[0, 1], [1, 0]]) {
      const r = analyse(validateSBox('bit', 'One bit', 1, 1, table));
      expect(r.degree.value).toBe(1);
      expect(r.degree.bound).toBe(1);
    }
  });
  it('a constant S-box: NL 0 and δ = 2^n, flagged constant', () => {
    const r = analyse(validateSBox('c', 'constant', 4, 4, new Array(16).fill(5)));
    expect(r.constant).toBe(true);
    expect(r.nl.value).toBe(0);
    expect(r.delta.value).toBe(16);
    expect(r.nl.tone).toBe('alarm');
  });
  it('a non-permutation is labelled, yet NL, δ and degree are still computed (invariant 3)', () => {
    const t = affineStartTable();
    t[0] = t[1]; // a repeated output: no longer a permutation
    const r = analyse(validateSBox('np', 'edited', 4, 4, t));
    expect(r.permutation).toBe(false);
    expect(r.nl.value).toBe(refNonlinearity(t, 4, 4));
    expect(r.delta.value).toBe(refDelta(t, 4, 4));
    expect(r.degree.value).toBeGreaterThanOrEqual(1);
    expect(() => invert(r.sbox)).toThrow(/not a permutation/);
  });
  it('n > 8 is refused with the browser budget explained', () => {
    expect(() => validateSBox('big', 'big', 9, 9, new Array(512).fill(0))).toThrow(SBoxError);
    expect(() => validateSBox('big', 'big', 9, 9, new Array(512).fill(0))).toThrow(/budget/);
  });
  it('a table of the wrong length is refused', () => {
    expect(() => validateSBox('x', 'x', 4, 4, new Array(15).fill(0))).toThrow(/needs 16 entries/);
  });
  it('an entry wider than m bits is refused', () => {
    const t = new Array(16).fill(0);
    t[3] = 16;
    expect(() => validateSBox('x', 'x', 4, 4, t)).toThrow(/does not fit/);
  });
  it('non-hex input is refused when parsing', () => {
    expect(() => parseTable('1 2 zz')).toThrow(/not hexadecimal/);
    expect(parseTable('0x1, f  a')).toEqual([1, 15, 10]);
  });
});

describe('Negative-claim evidence: an optimal S-box alone is not a cipher', () => {
  it('c = S(p ⊕ k) with the APN Gold map falls to one known pair', () => {
    const gold = builtInSBoxes().find((s) => s.id === 'gold')!;
    for (let key = 0; key < 32; key++) {
      for (const p of [0, 7, 19, 31]) {
        const c = encryptToy(gold, key, p);
        expect(recoverKey(gold, p, c)).toBe(key);
      }
    }
  });
});
