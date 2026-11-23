# Claims and their evidence — Boolean Function Bench

Batch requirement 1. Every claim the page makes, how it is produced, the test that pins it, the source, and how far it can be read.

| Claim | Execution mode | Evidence (test name) | Source | Interpretation limit |
|---|---|---|---|---|
| The AES S-box is generated, not typed: S[00] = 63, S[01] = 7c, S[53] = ed, and the first row of the published table | computed | unit `generated table: S[00] = 63, S[01] = 7c, S[53] = ed and the published first row`, `SHA-256 of the 256 bytes matches the brief`, `GF(2^8) multiplication matches FIPS 197 §4.2…` | FIPS 197 §4.2, §5.1.1 | — |
| AES S-box: nonlinearity 112 (max \|W\| = 32), δ = 4, algebraic degree 7 | computed | unit `NL = 112 with max \|W\| = 32, δ = 4, degree 7`, `A2. a second, definitional route agrees…`; claims `the comparison table prints the FIPS 197 AES results…`, `Walsh headline: NL = 2^(n−1) − max\|W\|/2…` | FIPS 197 (the S-box); the metrics are computed here | Properties of one S-box, not of AES |
| Bent function x1x2 ⊕ x3x4: every \|W\| = 4, NL 6, not balanced | computed | unit `every \|W(a)\| = 4 and NL = 6`, `is not balanced (6 ones, 10 zeros)` | Rothaus 1976 (cited by reference; not in the library) | — |
| Gold x³ over GF(2⁵): δ = 2 (APN), NL 12, a permutation; meets both bounds | computed | unit `δ = 2 (APN), NL = 12, and it is a permutation`, `meets both bounds…` | Nyberg 1993; Carlet–Charpin–Zinoviev 1998 for the bounds | The CCZ attribution of the bounds is cited, not re-read in this build |
| Inversion over GF(2⁴): δ = 4 | computed | unit `δ = 4`; claims `difference table: δ printed for S-box B equals δ recomputed…` | Nyberg 1993 | — |
| Walsh coefficient = agreements − disagreements, for every mask | computed | unit `counting agreements minus disagreements equals the butterfly…`; claims `counting check: agree + disagree = 2^n…` | definition | — |
| Vectorial NL is the minimum over nonzero output masks | computed | unit `vectorial NL is the MINIMUM over nonzero masks…` | definition | — |
| Every difference-table row sums to 2^n | computed | claims `a difference-table row sums to 2^n…` | definition | — |
| The degree stepper reaches the ANF of the Gold map | computed | claims `degree: the ANF the stepper reaches is the ANF recomputed here…` | Möbius transform | — |
| An affine S-box scores NL 0, δ = 16, degree 1; the intro tells it apart from inversion | computed | unit `the affine starting S-box scores NL 0, δ = 16 and degree 1…`; claims `the intro tells the affine S-box apart…` | — | — |
| An optimal S-box alone is not a cipher: c = S(p ⊕ k) with the Gold map falls to one known pair | computed | unit `c = S(p ⊕ k) with the APN Gold map falls to one known pair`; claims `the negative claim: the APN Gold map scores optimal…`, `the toy cipher: the recovered key really re-encrypts…` | — | A one-round toy, not a real cipher |
| Editing the table retires stale measurements; re-selecting the same S-box does not | computed | claims `editing the table retires the measurements…`, `re-selecting the same S-box does not retire a current result` | — | — |
| Fail-closed: constant S-box, non-permutation (still measured), n > 8, wrong length, over-wide entries, non-hex input | computed | unit `F. Fail-closed edge cases` (six tests) | — | — |
