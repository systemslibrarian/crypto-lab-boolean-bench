import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { gfMul } from '../gf/gf2n';
import { AES_FIELD, aesAffine, aesSBoxTable } from '../sboxes/aes';
import { affineStartTable, bentTable, builtInSBoxes, goldCubeTable, inverse4Table } from '../sboxes/catalog';
import { FIPS197_ROW0, refDegree, refDelta, refNonlinearity } from '../reference.test-helpers';
import { algebraicDegree } from './anf';
import { differentialUniformity } from './ddt';
import { analyse } from './metrics';
import { isPermutation, validateSBox } from './types';
import { nonlinearity, walshByCounting, walshSpectrum } from './walsh';

const box = (id: string) => builtInSBoxes().find((s) => s.id === id)!;

describe('A. AES S-box (FIPS 197)', () => {
  it('GF(2^8) multiplication matches FIPS 197 §4.2: {57}·{83} = {c1}, {57}·{13} = {fe}', () => {
    expect(gfMul(AES_FIELD, 0x57, 0x83)).toBe(0xc1);
    expect(gfMul(AES_FIELD, 0x57, 0x13)).toBe(0xfe);
  });
  it('generated table: S[00] = 63, S[01] = 7c, S[53] = ed and the published first row', () => {
    const t = aesSBoxTable();
    expect(t[0x00]).toBe(0x63);
    expect(t[0x01]).toBe(0x7c);
    expect(t[0x53]).toBe(0xed);
    expect(t.slice(0, 16)).toEqual(FIPS197_ROW0);
  });
  it('SHA-256 of the 256 bytes matches the brief', () => {
    const h = createHash('sha256').update(Uint8Array.from(aesSBoxTable())).digest('hex');
    expect(h).toBe('c2d8e5eed6cbebd8625fc18f81486a7733c04f9b0129ffbe974c68b90308b4f2');
  });
  it('NL = 112 with max |W| = 32, δ = 4, degree 7', () => {
    const s = box('aes');
    const nl = nonlinearity(s);
    expect(nl.nl).toBe(112);
    expect(nl.maxW).toBe(32);
    expect(differentialUniformity(s).delta).toBe(4);
    expect(algebraicDegree(s).degree).toBe(7);
  });
  it('A2. a second, definitional route agrees: direct correlation sums, explicit DDT counting, naive ANF', () => {
    const t = aesSBoxTable();
    expect(refNonlinearity(t, 8, 8)).toBe(112);
    expect(refDelta(t, 8, 8)).toBe(4);
    expect(refDegree(t, 8, 8)).toBe(7);
  }, 60_000);
  it('omitting the affine constant changes the table (S[00] would be 00)', () => {
    expect(aesAffine(0, 0)).toBe(0);
    expect(aesAffine(0)).toBe(0x63);
  });
});

describe('B. Bent function x1x2 ⊕ x3x4', () => {
  it('every |W(a)| = 4 and NL = 6', () => {
    const s = box('bent');
    const w = walshSpectrum(s, 1);
    expect(Array.from(w, Math.abs)).toEqual(new Array(16).fill(4));
    expect(nonlinearity(s).nl).toBe(6);
    expect(refNonlinearity(bentTable(), 4, 1)).toBe(6);
  });
  it('is not balanced (6 ones, 10 zeros)', () => {
    expect(bentTable().filter((v) => v === 1).length).toBe(6);
  });
});

describe('C. Gold x³ over GF(2⁵), modulus x⁵ + x² + 1', () => {
  it('δ = 2 (APN), NL = 12, and it is a permutation', () => {
    const s = box('gold');
    expect(differentialUniformity(s).delta).toBe(2);
    expect(nonlinearity(s).nl).toBe(12);
    expect(isPermutation(s)).toBe(true);
    expect(refDelta(goldCubeTable(), 5, 5)).toBe(2);
    expect(refNonlinearity(goldCubeTable(), 5, 5)).toBe(12);
  });
  it('meets both bounds: the page reports OPTIMAL for NL and δ', () => {
    const r = analyse(box('gold'));
    expect(r.nl.tone).toBe('optimal');
    expect(r.delta.tone).toBe('optimal');
    expect(r.nl.bound).toBe(12);
    expect(r.delta.bound).toBe(2);
  });
});

describe('D. Inversion over GF(2⁴), modulus x⁴ + x + 1, 0 ↦ 0', () => {
  it('δ = 4', () => {
    expect(differentialUniformity(box('inv4')).delta).toBe(4);
    expect(refDelta(inverse4Table(), 4, 4)).toBe(4);
  });
});

describe('Metric definitions', () => {
  it('counting agreements minus disagreements equals the butterfly, for every a and b of the Gold map', () => {
    const s = box('gold');
    for (let b = 1; b < 32; b++) {
      const w = walshSpectrum(s, b);
      for (let a = 0; a < 32; a++) {
        const c = walshByCounting(s, b, a);
        expect(c.agree + c.disagree).toBe(32);
        expect(c.w).toBe(w[a]);
      }
    }
  });
  it('vectorial NL is the MINIMUM over nonzero masks (mask 0 would make every S-box 0)', () => {
    // The affine map with two outputs swapped: its components differ (NL 0 for some masks, 2 for others).
    const t = affineStartTable();
    [t[0], t[5]] = [t[5], t[0]];
    const s = validateSBox('swap', 'swapped', 4, 4, t);
    const per = [];
    for (let b = 1; b < 16; b++) {
      const w = walshSpectrum(s, b);
      per.push(8 - Math.max(...Array.from(w, Math.abs)) / 2);
    }
    expect(nonlinearity(s).nl).toBe(Math.min(...per));
    expect(Math.max(...per)).toBeGreaterThan(Math.min(...per));
  });
  it('the affine starting S-box scores NL 0, δ = 16 and degree 1 — the worst possible', () => {
    const s = validateSBox('w', 'weak', 4, 4, affineStartTable());
    const r = analyse(s);
    expect(r.nl.value).toBe(0);
    expect(r.delta.value).toBe(16);
    expect(r.degree.value).toBe(1);
    expect([r.nl.tone, r.delta.tone, r.degree.tone]).toEqual(['alarm', 'alarm', 'alarm']);
  });
});
