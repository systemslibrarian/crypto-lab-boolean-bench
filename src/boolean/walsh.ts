import { parity, type SBox } from './types';

/**
 * Walsh transform of the component function f_b(x) = b·S(x):
 *   W(a) = Σ_x (−1)^(b·S(x) ⊕ a·x)
 * computed with the fast Walsh–Hadamard butterfly (n·2^n additions).
 */
export function walshSpectrum(s: SBox, b: number): Int32Array {
  const size = 1 << s.n;
  const w = new Int32Array(size);
  for (let x = 0; x < size; x++) w[x] = parity(b & s.table[x]) ? -1 : 1;
  for (let h = 1; h < size; h <<= 1) {
    for (let i = 0; i < size; i += h << 1) {
      for (let j = i; j < i + h; j++) {
        const u = w[j];
        const v = w[j + h];
        w[j] = u + v;
        w[j + h] = u - v;
      }
    }
  }
  return w;
}

/** One coefficient by direct counting: agreements minus disagreements. */
export function walshByCounting(s: SBox, b: number, a: number): { agree: number; disagree: number; w: number } {
  let agree = 0;
  for (let x = 0; x < 1 << s.n; x++) {
    if (parity(b & s.table[x]) === parity(a & x)) agree++;
  }
  const disagree = (1 << s.n) - agree;
  return { agree, disagree, w: agree - disagree };
}

export function maxAbs(w: Int32Array): { value: number; at: number } {
  let value = -1;
  let at = 0;
  for (let i = 0; i < w.length; i++) {
    const v = Math.abs(w[i]);
    if (v > value) {
      value = v;
      at = i;
    }
  }
  return { value, at };
}

/** NL(f) = 2^(n−1) − max_a |W_f(a)| / 2. */
export function componentNonlinearity(s: SBox, b: number): { nl: number; maxW: number; at: number } {
  const { value, at } = maxAbs(walshSpectrum(s, b));
  return { nl: (1 << (s.n - 1)) - value / 2, maxW: value, at };
}

/**
 * Vectorial nonlinearity: the MINIMUM over nonzero output masks b. Mask 0 is
 * excluded — 0·S is the constant function, whose nonlinearity is 0 for every
 * S-box and would make the metric meaningless.
 */
export function nonlinearity(s: SBox): { nl: number; maxW: number; mask: number; inputMask: number } {
  let best = { nl: Infinity, maxW: 0, mask: 1, inputMask: 0 };
  for (let b = 1; b < 1 << s.m; b++) {
    const c = componentNonlinearity(s, b);
    if (c.nl < best.nl) best = { nl: c.nl, maxW: c.maxW, mask: b, inputMask: c.at };
  }
  return best;
}
