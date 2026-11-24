import { analyse, type MetricResult, type Report } from '../boolean/metrics';
import { encryptToy, recoverKey } from '../boolean/toycipher';
import { SBoxError, validateSBox, type SBox } from '../boolean/types';
import { affineStartTable, formatTable, parseTable } from '../sboxes/catalog';
import { clear, evidenceRetired, h, hex, note, panelIntro, toneChip, verdict } from './dom';
import { allSBoxes, setCustom } from './store';

function metricCell(m: MetricResult): HTMLElement {
  return h(
    'td',
    {},
    h('span', { class: 'metric-value', 'data-claim': `${m.key}-value` }, String(m.value)),
    h('span', { class: 'metric-bound' }, ` (${m.boundText.split(' (')[0]})`),
    h('br', {}),
    toneChip(m.tone, m.verdict, m.key),
  );
}

function row(r: Report): HTMLElement {
  const s = r.sbox;
  return h(
    'tr',
    { 'data-sbox': s.id },
    h('th', { scope: 'row' }, s.name),
    h('td', {}, `${s.n} → ${s.m}`),
    h('td', {}, r.permutation ? 'yes' : s.n === s.m ? 'no' : 'n/a (n ≠ m)'),
    metricCell(r.nl),
    metricCell(r.delta),
    metricCell(r.degree),
  );
}

function compareTable(reports: Report[]): HTMLElement {
  return h(
    'div',
    { class: 'table-wrap', role: 'region', tabindex: '0', 'aria-label': 'Every S-box measured side by side' },
    h(
      'table',
      { class: 'kat-table compare-table' },
      h(
        'thead',
        {},
        h('tr', {}, ...['S-box', 'Size', 'Permutation', 'Nonlinearity (bound)', 'δ (bound)', 'Degree (bound)'].map((t) => h('th', { scope: 'col' }, t))),
      ),
      h('tbody', {}, ...reports.map(row)),
    ),
  );
}

/** Random key for the toy cipher, per session, from the browser's CSPRNG. */
function randomKey(bits: number): number {
  const b = new Uint8Array(1);
  crypto.getRandomValues(b);
  return b[0] & ((1 << bits) - 1);
}

export function renderComparePanel(root: HTMLElement): void {
  root.append(
    panelIntro(
      'Four S-boxes side by side — and one you edit',
      'The same three measurements on every S-box: nonlinearity (how far from the best linear guess), differential uniformity δ (how often the best difference bet wins) and algebraic degree. Each is set against the best value the mathematics allows for that size.',
      'The bent function is a single-output (4 → 1) Boolean function, included because it reaches the nonlinearity bound exactly — at the price of not being balanced, which is why no permutation can.',
    ),
  );
  const tableHost = h('div', {});
  const drawTable = (): void => {
    clear(tableHost);
    tableHost.append(compareTable(allSBoxes().map(analyse)));
  };
  drawTable();

  // ── The Gold fixture: optimal numbers, and still not a cipher ───────────────
  const gold = allSBoxes().find((s) => s.id === 'gold')!;
  const g = analyse(gold);
  const toyOut = h('div', { class: 'output' });
  const toyBtn = h('button', { class: 'btn btn-primary', type: 'button', id: 'toy-run' }, 'Use it alone as a cipher: c = S(p ⊕ k)') as HTMLButtonElement;
  const runToy = (s: SBox): void => {
    const mask = (1 << s.n) - 1;
    const key = randomKey(s.n);
    // p ≠ 0, so the "⊕ p" step of the recovery always changes the answer, and
    // p2 ≠ p1, so the second pair is genuinely unseen.
    const p1 = 1 + (randomKey(s.n) % mask);
    const p2 = p1 === mask ? 1 : p1 + 1;

    const c1 = encryptToy(s, key, p1);
    const k = recoverKey(s, p1, c1);
    const c2 = encryptToy(s, key, p2);
    const checks = encryptToy(s, k, p2) === c2;
    clear(toyOut);
    toyOut.append(
      h(
        'div',
        { class: 'both-sides' },
        h('p', { class: 'both-sides-eq' }, `A secret ${s.n}-bit key k was drawn with crypto.getRandomValues. The attacker sees one known pair:`),
        h('p', { class: 'eq-derivation' }, `p = ${hex(p1, 2)}, c = S(p ⊕ k) = ${hex(c1, 2)}`),
        h('p', { class: 'eq-derivation' }, `k = S⁻¹(c) ⊕ p = `, h('strong', { 'data-claim': 'toy-key' }, hex(k, 2))),
        h('p', { class: 'eq-derivation' }, `Check on a second, unseen pair: S(${hex(p2, 2)} ⊕ ${hex(k, 2)}) = ${hex(encryptToy(s, k, p2), 2)}; the real ciphertext is ${hex(c2, 2)}.`),
        checks
          ? verdict('alarm', 'KEY RECOVERED from one known pair — the recovered key encrypts the second pair correctly.')
          : verdict('fail', 'Recovery failed.'),
      ),
    );
  };
  toyBtn.addEventListener('click', () => runToy(gold));

  const fixture = h(
    'div',
    { class: 'fixture-card', id: 'gold-fixture' },
    h('h3', {}, 'The best 5-bit S-box on this page'),
    h('p', {}, `${gold.name}: nonlinearity and differential uniformity both at the best value possible for 5 bits, and invertible. (Its degree is 2 — x³ is quadratic — which is exactly what the Algebraic degree tab measures.)`),
    h(
      'ul',
      { class: 'chip-list', role: 'list' },
      h('li', { role: 'listitem' }, 'Nonlinearity ', h('strong', {}, String(g.nl.value)), ' ', toneChip(g.nl.tone, g.nl.verdict, 'gold-nl')),
      h('li', { role: 'listitem' }, 'δ = ', h('strong', {}, String(g.delta.value)), ' ', toneChip(g.delta.tone, g.delta.verdict, 'gold-delta')),
      h('li', { role: 'listitem' }, 'Permutation ', toneChip(g.permutation ? 'optimal' : 'alarm', g.permutation ? 'yes — invertible' : 'no', 'gold-perm')),
    ),
    h(
      'div',
      { class: 'negative-claim', 'data-negative-claim': 'gold' },
      h('p', { class: 'negative-head' }, 'OPTIMAL DIFFERENTIALLY — AND THIS IS NOT A CIPHER'),
      h(
        'p',
        {},
        'A perfect score here is not a secure cipher. Nonlinearity and differential uniformity bound two attacks on one round; they say nothing about the key schedule, the number of rounds or the rest of the design.',
      ),
    ),
    toyBtn,
    toyOut,
  );

  // ── The editor ──────────────────────────────────────────────────────────────
  const ta = h('textarea', {
    id: 'editor-table',
    class: 'mono-input',
    rows: 3,
    spellcheck: 'false',
    'aria-describedby': 'editor-help',
  }) as HTMLTextAreaElement;
  ta.value = formatTable(affineStartTable(), 1);
  const analyseBtn = h('button', { class: 'btn btn-primary', type: 'button', id: 'editor-analyse' }, 'Analyse') as HTMLButtonElement;
  const resetBtn = h('button', { class: 'btn btn-ghost', type: 'button', id: 'editor-reset' }, 'Reset to the affine start') as HTMLButtonElement;
  const editorOut = h('div', { class: 'output', id: 'editor-out' });
  let analysedText: string | null = null;

  const analyseEditor = (): void => {
    clear(editorOut);
    analysedText = null;
    let table: number[];
    try {
      table = parseTable(ta.value);
      const n = Math.log2(table.length);
      if (!Number.isInteger(n)) throw new SBoxError(`${table.length} entries is not a power of two; an n-bit S-box has 2^n entries`);
      const s = validateSBox('edited', 'Your edited S-box', n, n, table);
      ta.removeAttribute('aria-invalid');
      const r = analyse(s);
      setCustom(s);
      drawTable();
      analysedText = ta.value;
      editorOut.append(h('p', {}, `${s.n} → ${s.n} bits, ${1 << s.n} entries.`));
      if (r.constant) {
        editorOut.append(
          note('danger', 'Constant S-box: every input gives the same output, so it carries no information about its input at all. Its nonlinearity is 0 and δ is 2^n.'),
        );
      }
      if (!r.permutation) {
        editorOut.append(
          note('caveat', 'Not a permutation: two inputs share an output, so this S-box cannot be inverted as a standalone substitution layer. Nonlinearity, δ and degree are still defined for it and shown; the permutation-only degree bound n − 1 is withheld.'),
        );
      }
      editorOut.append(
        h(
          'ul',
          { class: 'chip-list', role: 'list' },
          ...[r.nl, r.delta, r.degree].map((m) =>
            h('li', { role: 'listitem' }, `${m.label}: `, h('strong', { 'data-claim': `editor-${m.key}` }, String(m.value)), ` (${m.boundText.split(' (')[0]}) `, toneChip(m.tone, m.verdict, `editor-${m.key}`)),
          ),
        ),
      );
    } catch (e) {
      ta.setAttribute('aria-invalid', 'true');
      const msg = e instanceof Error ? e.message : String(e);
      editorOut.append(verdict('fail', `Not analysed: ${msg}.`));
    }
  };
  analyseBtn.addEventListener('click', analyseEditor);
  resetBtn.addEventListener('click', () => {
    ta.value = formatTable(affineStartTable(), 1);
    analyseEditor();
  });
  ta.addEventListener('input', () => {
    if (analysedText !== null && ta.value === analysedText) return;
    if (editorOut.querySelector('.evidence-retired')) return;
    clear(editorOut);
    editorOut.append(evidenceRetired('Inputs changed — the measurements above belonged to the previous table and were retired. Press Analyse to recompute.'));
  });

  root.append(
    tableHost,
    fixture,
    h('h3', {}, 'Break it yourself: edit an S-box'),
    h(
      'p',
      {},
      'The editor starts from an affine 4-bit map, S(x) = rotl(x, 1) ⊕ 3: rotation is linear, so every metric is as bad as it can be. Change two entries and press Analyse. Does the degree change? Does any output mask still give an affine component and keep the overall nonlinearity at zero? Any 2^n hex entries with n ≤ 8 are accepted.',
    ),
    h(
      'div',
      { class: 'controls' },
      h(
        'div',
        { class: 'control' },
        h('label', { for: 'editor-table' }, 'S-box table (hex, one entry per output, in input order)'),
        ta,
        h('p', { class: 'help', id: 'editor-help' }, 'Entry i is S(i). 16 entries make a 4-bit S-box; 256 an 8-bit one. More than 256 is refused.'),
      ),
      h('div', { class: 'action-row' }, analyseBtn, resetBtn),
    ),
    editorOut,
  );
  analyseEditor();
}
