import { h, note, panelIntro } from './dom';

const lab = (slug: string, title: string, what: string): HTMLElement =>
  h('li', {}, h('a', { href: `https://systemslibrarian.github.io/crypto-lab-${slug}/`, target: '_blank', rel: 'noopener noreferrer' }, title), ` — ${what}`);

export function renderBuysPanel(root: HTMLElement): void {
  root.append(
    panelIntro(
      'What the numbers buy — and what they do not',
      'The largest Walsh coefficient is the bias a linear-cryptanalysis attacker starts from; the largest difference-table cell is the probability a differential attacker starts from. Cipher designers combine these per-S-box numbers with the diffusion layer to bound how many rounds an attack must survive.',
    ),
    h('h3', {}, 'Where those numbers get used'),
    h(
      'ul',
      { class: 'plain-list' },
      lab('matsui-line', 'Matsui Line', 'linear cryptanalysis on a toy SPN: the bias that max|W| bounds'),
      lab('biham-lens', 'Biham Lens', 'differential cryptanalysis: the difference-table probabilities that δ bounds'),
      lab('aes-anatomy', 'AES Anatomy', 'the AES S-box measured here, inside the whole cipher'),
      lab('sleeve-check', 'Sleeve Check', 'where an S-box came from: structure hidden in a published table'),
      lab('lightweight-bench', 'Lightweight Bench', '4-bit S-boxes in real lightweight ciphers'),
      lab('lfsr-forge', 'LFSR Forge', 'single-output Boolean combiners in stream ciphers'),
    ),
    note(
      'danger',
      'A perfect score is not a secure cipher. Nonlinearity and differential uniformity bound two attacks on one round; they say nothing about the key schedule, the number of rounds or the rest of the design. The Side-by-side tab breaks an optimal S-box used on its own with one known pair.',
    ),
    h('h3', {}, 'Not built here'),
    h(
      'ul',
      { class: 'plain-list', 'data-non-goals': '' },
      h('li', {}, 'Searching for new APN functions.'),
      h('li', {}, 'CCZ- and EA-equivalence classification of S-boxes.'),
      h('li', {}, 'Boomerang uniformity and linear branch numbers — the metric registry has a place for them; neither is computed.'),
      h('li', {}, 'Hardware cost and side channels: a good table can still leak through power or timing.'),
    ),
    h('h3', {}, 'Sources'),
    h(
      'ul',
      { class: 'plain-list' },
      h('li', {}, 'NIST FIPS 197, Advanced Encryption Standard — the S-box construction and the GF(2⁸) examples.'),
      h('li', {}, 'K. Nyberg, "Differentially uniform mappings for cryptography", EUROCRYPT 1993 — differential uniformity and the x^(2^k+1) maps.'),
      h('li', {}, 'C. Carlet, P. Charpin, V. Zinoviev, "Codes, bent functions and permutations suitable for DES-like cryptosystems", Designs, Codes and Cryptography, 1998 — the nonlinearity bounds used here.'),
      h('li', {}, 'O. S. Rothaus, "On bent functions", J. Combin. Theory A, 1976 — the origin of bent functions.'),
    ),
  );
}
