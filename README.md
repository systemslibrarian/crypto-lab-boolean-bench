# Boolean Function Bench

**Walsh spectrum · nonlinearity · differential uniformity · algebraic degree**

Browser-based S-box quality bench — the AES S-box, a bent function, the Gold APN power map and a deliberately weak S-box side by side, with Walsh spectra, nonlinearity, difference distribution tables and algebraic degree computed live, and the bounds each one meets or misses.

## What It Is

An S-box is the small lookup table that gives a block cipher its nonlinearity. This lab measures S-boxes the way a designer does, by computing from the table itself:

- **Walsh spectrum and nonlinearity.** For an output mask b, the Walsh coefficient W(a) = Σₓ (−1)^(b·S(x) ⊕ a·x) counts how often the linear guess a·x matches the output bit b·S(x), minus how often it misses. Nonlinearity is NL = 2^(n−1) − max|W|/2, minimised over every nonzero output mask (mask 0 is excluded: it is the constant function).
- **Difference distribution table and differential uniformity δ.** DDT[a][b] counts the inputs x with S(x) ⊕ S(x ⊕ a) = b. δ is the largest cell with a ≠ 0; δ = 2 for an n → n map is APN (almost perfect nonlinear).
- **Algebraic degree.** Each output bit's algebraic normal form, computed with the Möbius transform; the degree is the largest monomial any output bit needs.

Everything is hand-rolled TypeScript: GF(2^n) arithmetic, the fast Walsh–Hadamard transform, the difference table and the Möbius transform, because these are the parts being taught. There is no backend and no library doing the mathematics.

**Security model and scope.** These are properties of one S-box. They bound linear and differential cryptanalysis of one round; they are not a verdict on any cipher, and the page demonstrates that limit (see the negative claim below). What is real: every number on screen is computed from the table on screen. What is modelled: the "toy cipher" c = S(p ⊕ k) exists only to show an optimal S-box used alone falling to one known pair.

**Not production software — a teaching demo.**

## Exhibits

1. **What an S-box must do.** Two 4-bit permutations that both look like random shuffles; one is affine. Measuring them is the only way to tell.
2. **Walsh spectrum.** Pick an S-box and an output mask; the full spectrum drawn with every maximum marked by a shape as well as a colour; NL computed with its formula on screen; a hand count of one coefficient (agreements minus disagreements, with the bit strip for n ≤ 5) compared with the butterfly's answer.
3. **Difference table.** One row as a heat table with the number in every cell, δ and where it occurs, and the actual input pairs behind the largest cell recomputed pair by pair. The whole table for 4-bit S-boxes.
4. **Algebraic degree.** Degree per output bit, the ANF written out for n ≤ 5, and a stage-by-stage Möbius stepper that ends in the ANF.
5. **Side by side.** AES, the bent function x1x2 ⊕ x3x4, the Gold map x³ over GF(2⁵) and inversion over GF(2⁴), each metric against its bound with an OPTIMAL / ALARM / neutral chip; the Gold fixture and its broken toy cipher; and an editor that starts from an affine map so you can break it into something nonlinear yourself.
6. **What the numbers buy.** Where these numbers get used in other labs, what is not built here, and sources.

## When to Use It

- To see why "looks random" is not a measurement, and what the measurements are.
- To check a small S-box you designed or found in a paper: paste its table into the editor.
- To connect the AES S-box's well-known numbers (NL 112, δ 4, degree 7) to where they come from.
- **Do NOT** use a good score here as evidence that a cipher is secure. These metrics say nothing about the key schedule, the number of rounds or the diffusion layer.
- **Do NOT** use it for S-boxes wider than 8 bits; the page refuses them.

## Live Demo

https://systemslibrarian.github.io/crypto-lab-boolean-bench/

Measure two look-alike S-boxes, scan Walsh spectra and difference tables, step the Möbius transform, compare four S-boxes against their bounds, break an optimal S-box used alone, and edit an S-box until its nonlinearity leaves zero.

## What Can Go Wrong

An S-box is good when no linear approximation and no input difference predicts its output well. If a component function is affine (NL = 0), a linear approximation holds with certainty; if one input difference fixes the output difference (δ = 2^n), a differential holds with certainty. Both failures are invisible in the table itself and obvious in the measurements. The opposite mistake is just as real: a perfect S-box does not make a cipher.

## Real-World Usage

- The AES S-box is multiplicative inversion in GF(2⁸) followed by an affine map (NIST FIPS 197, 2001). This lab generates it from that definition and checks it against the standard before use.
- Nyberg (EUROCRYPT 1993) introduced differential uniformity and showed that the power maps x^(2^k+1) over GF(2^n) are differentially 2^s-uniform with s = gcd(k, n) — APN when gcd(k, n) = 1.

## How to Run Locally

```bash
npm ci
npm run dev          # http://localhost:5173/crypto-lab-boolean-bench/
npm test             # unit tests and KATs (Vitest)
npm run test:e2e:all # accessibility gate + claims suite (Playwright, builds first)
npm run test:mutations
```

## Related Demos

- [Matsui Line](https://systemslibrarian.github.io/crypto-lab-matsui-line/) — linear cryptanalysis: the bias max|W| bounds.
- [Biham Lens](https://systemslibrarian.github.io/crypto-lab-biham-lens/) — differential cryptanalysis: the probabilities δ bounds.
- [AES Anatomy](https://systemslibrarian.github.io/crypto-lab-aes-anatomy/) — the AES S-box inside the whole cipher.
- [Sleeve Check](https://systemslibrarian.github.io/crypto-lab-sleeve-check/) — S-box provenance.
- [Lightweight Bench](https://systemslibrarian.github.io/crypto-lab-lightweight-bench/) — 4-bit S-boxes in lightweight ciphers.
- [LFSR Forge](https://systemslibrarian.github.io/crypto-lab-lfsr-forge/) — single-output Boolean combiners in stream ciphers.

## Build & Verify

- **Unit tests (Vitest): 21 tests**, including the KATs:
  - AES S-box: S[00] = 63, S[01] = 7c, S[53] = ed and the first row of FIPS 197 Figure 7; SHA-256 of the 256 bytes `c2d8e5ee…08b4f2`; NL 112 (max |W| 32), δ 4, degree 7. GF(2⁸): {57}·{83} = {c1}, {57}·{13} = {fe} (FIPS 197 §4.2).
  - Bent x1x2 ⊕ x3x4: every |W| = 4, NL 6. Gold x³ over GF(2⁵) (x⁵ + x² + 1): δ 2, NL 12, a permutation. Inversion over GF(2⁴) (x⁴ + x + 1): δ 4.
  - A second, definitional route for AES (direct correlation sums, explicit difference counting, naive ANF) agrees with the fast transforms.
  - Fail-closed edge cases: constant S-box, non-permutation (metrics still computed), n > 8 refused, wrong length, over-wide entries, non-hex input.
- **Claims suite (Playwright): 11 tests.** Each re-derives what the page prints by a route the source does not take: NL from the printed coefficient table, δ from the S-box table the intro prints, the ANF by an independent Möbius transform, the toy-cipher key by re-encrypting, plus retirement and a no-op guard. The negative claim is asserted in its fixture state (§4.1d).
- **Mutation ledger: 12 of 12 mutations killed (six in the mathematics, five in what the page claims, one proving the accessibility gate bites)** — run by `scripts/mutate.mjs`, which records each mutation as a concrete patch and counts a kill only if the owning test passed unmutated, the patch applied, the bundle hash moved and the build succeeded. The run's own record is `mutations/observed.json`.
- **Accessibility gate:** axe-core WCAG 2.1 A/AA plus arithmetic contrast, non-text contrast, reflow at 380px, scroll-region and focus oracles, over every driven state at desktop and phone width. Zero violations. Copied from crypto-lab-schnorr-forge and rewritten for this lab.

## Negative claim

> A perfect score here is not a secure cipher. Nonlinearity and differential uniformity bound two attacks on one round; they say nothing about the key schedule, the number of rounds or the rest of the design.

Evidence fixture: the Gold x³ map shows OPTIMAL for nonlinearity and δ and is invertible, beside the banner **OPTIMAL DIFFERENTIALLY — AND THIS IS NOT A CIPHER**; one click uses it alone as c = S(p ⊕ k) and recovers k from a single known pair.

## Performance

The largest computation — all 255 Walsh spectra, the full 256 × 256 difference table and the ANF of every output bit of the AES S-box — measured 3.8 ms per run in Node 22 (`analyse()`, averaged over five runs), so it runs synchronously on the main thread rather than in a worker. Everything is capped at n ≤ 8.

## Sources

- NIST, *FIPS 197: Advanced Encryption Standard (AES)*, 2001 — https://doi.org/10.6028/NIST.FIPS.197-upd1
- K. Nyberg, "Differentially uniform mappings for cryptography", EUROCRYPT 1993 — https://doi.org/10.1007/3-540-48285-7_6
- C. Carlet, P. Charpin, V. Zinoviev, "Codes, bent functions and permutations suitable for DES-like cryptosystems", *Designs, Codes and Cryptography* 15, 1998 — https://doi.org/10.1023/A:1008344232130
- O. S. Rothaus, "On 'bent' functions", *J. Combinatorial Theory A* 20, 1976 — https://doi.org/10.1016/0097-3165(76)90024-8

---

*One of the browser demos in the [Crypto Lab](https://crypto-lab.systemslibrarian.dev/) suite.*

*"So whether you eat or drink or whatever you do, do it all for the glory of God." — 1 Corinthians 10:31*
