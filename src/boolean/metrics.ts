import { algebraicDegree } from './anf';
import { differentialUniformity } from './ddt';
import { isConstant, isPermutation, type SBox } from './types';
import { nonlinearity } from './walsh';

export type Tone = 'optimal' | 'ok' | 'alarm';

export interface MetricResult {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly bound: number;
  readonly boundText: string;
  readonly tone: Tone;
  readonly verdict: string;
}

/**
 * Upper bound on nonlinearity used for the comparison.
 * - m = n and n odd: 2^(n−1) − 2^((n−1)/2), reached by almost-bent maps (Gold x³ for n = 5).
 * - otherwise: the bent bound 2^(n−1) − 2^(n/2 − 1), reached only by bent functions,
 *   which are never balanced — so a permutation can never reach it.
 * Both are stated in Carlet, Charpin and Zinoviev (1998).
 */
export function nlBound(n: number, m: number): { bound: number; text: string } {
  if (m === n && n % 2 === 1) {
    const b = 2 ** (n - 1) - 2 ** ((n - 1) / 2);
    return { bound: b, text: `≤ ${b} (2^(n−1) − 2^((n−1)/2), odd n, n → n)` };
  }
  const b = Math.floor(2 ** (n - 1) - 2 ** (n / 2 - 1));
  return { bound: b, text: `≤ ${b} (bent bound 2^(n−1) − 2^(n/2−1))` };
}

/** Lower bound on differential uniformity: δ ≥ max(2, 2^(n−m)); δ = 2 for n → n is APN. */
export function deltaBound(n: number, m: number): number {
  return Math.max(2, 2 ** Math.max(0, n - m));
}

export function nonlinearityMetric(s: SBox): MetricResult & { mask: number; inputMask: number; maxW: number } {
  const r = nonlinearity(s);
  const { bound, text } = nlBound(s.n, s.m);
  // One comparison decides both the tone and the words, so they cannot disagree.
  const meets = r.nl >= bound;
  const tone: Tone = r.nl === 0 ? 'alarm' : meets ? 'optimal' : 'ok';
  const verdict =
    r.nl === 0
      ? 'ALARM — some component is affine: a linear approximation holds with certainty'
      : meets
        ? 'OPTIMAL — meets the bound'
        : `below the bound by ${bound - r.nl}`;
  return { key: 'nl', label: 'Nonlinearity', value: r.nl, bound, boundText: text, tone, verdict, ...r };
}

export function deltaMetric(s: SBox): MetricResult & { a: number; b: number } {
  const r = differentialUniformity(s);
  const bound = deltaBound(s.n, s.m);
  const worst = 1 << s.n;
  // One comparison decides both the tone and the words, so they cannot disagree.
  const meets = r.delta <= bound;
  const tone: Tone = r.delta >= worst ? 'alarm' : meets ? 'optimal' : 'ok';
  const verdict =
    r.delta >= worst
      ? 'ALARM — some input difference fixes the output difference every time'
      : meets
        ? s.m === s.n && r.delta === 2
          ? 'OPTIMAL — APN (δ = 2)'
          : 'OPTIMAL — meets the lower bound'
        : `above the lower bound by ${r.delta - bound}`;
  return {
    key: 'delta',
    label: 'Differential uniformity δ',
    value: r.delta,
    bound,
    boundText: `≥ ${bound}`,
    tone,
    verdict,
    a: r.a,
    b: r.b,
  };
}

export function degreeMetric(s: SBox): MetricResult & { perCoordinate: number[] } {
  const r = algebraicDegree(s);
  const permutationBound = s.n > 1 && isPermutation(s);
  const bound = permutationBound ? s.n - 1 : s.n;
  const meets = r.degree >= bound;
  const tone: Tone = r.degree <= 1 ? 'alarm' : meets ? 'optimal' : 'ok';
  const verdict =
    r.degree <= 1
      ? 'ALARM — affine: every output bit is an affine function of the input'
      : meets
        ? 'OPTIMAL — maximum possible degree'
        : `below the maximum by ${bound - r.degree}`;
  return {
    key: 'degree',
    label: 'Algebraic degree',
    value: r.degree,
    bound,
    boundText: permutationBound ? `≤ ${bound} (n − 1 for a permutation)` : `≤ ${bound}`,
    tone,
    verdict,
    perCoordinate: r.perCoordinate,
  };
}

/**
 * The metric set computed for every S-box on the page.
 * // [extension] point — boomerang uniformity (BCT) or a linear branch number would
 * register here; neither is built on this page.
 */
export const METRIC_SET = [nonlinearityMetric, deltaMetric, degreeMetric] as const;

export interface Report {
  readonly sbox: SBox;
  readonly permutation: boolean;
  readonly constant: boolean;
  readonly nl: ReturnType<typeof nonlinearityMetric>;
  readonly delta: ReturnType<typeof deltaMetric>;
  readonly degree: ReturnType<typeof degreeMetric>;
}

export function analyse(s: SBox): Report {
  return {
    sbox: s,
    permutation: isPermutation(s),
    constant: isConstant(s),
    nl: nonlinearityMetric(s),
    delta: deltaMetric(s),
    degree: degreeMetric(s),
  };
}
