import { anfCoordinate, degreeOf, monomialName } from '../boolean/anf';
import { degreeMetric } from '../boolean/metrics';
import { popcount, type SBox } from '../boolean/types';
import { clear, h, hex, hexWidth, panelIntro, toneChip, verdict } from './dom';
import { sboxPicker } from './picker';

/** The Möbius butterfly, keeping every intermediate stage for the stepper. */
function mobiusStages(s: SBox, i: number): Uint8Array[] {
  const size = 1 << s.n;
  const c = new Uint8Array(size);
  for (let x = 0; x < size; x++) c[x] = (s.table[x] >> i) & 1;
  const stages = [c.slice()];
  for (let h2 = 1; h2 < size; h2 <<= 1) {
    for (let x = 0; x < size; x++) if (x & h2) c[x] ^= c[x ^ h2];
    stages.push(c.slice());
  }
  return stages;
}

export function renderDegreePanel(root: HTMLElement): void {
  root.append(
    panelIntro(
      'Algebraic degree: how tangled the output bits are',
      'Every output bit of an S-box can be written as an XOR of products of input bits — its algebraic normal form (ANF). A product of k input bits is a degree-k term. The degree of the S-box is the largest term any output bit needs.',
      'Degree 1 means every output bit is a plain XOR of input bits: the S-box is affine and adds nothing a linear-algebra attack cannot undo. A permutation of n bits can reach degree n − 1 at most.',
    ),
  );
  const coordSel = h('select', { id: 'deg-coord', class: 'select' }) as HTMLSelectElement;
  const summary = h('div', { class: 'output' });
  const stepOut = h('div', { class: 'output' });
  const progress = h('span', { class: 'step-progress', 'aria-live': 'polite' });
  const nextBtn = h('button', { class: 'btn btn-primary', type: 'button' }, 'Next stage') as HTMLButtonElement;
  const resetBtn = h('button', { class: 'btn btn-ghost', type: 'button' }, 'Reset') as HTMLButtonElement;
  let stage = 0;

  const picker = sboxPicker('deg-sbox', 'gold', () => {
    fill();
    stage = 0;
    render();
  });

  const fill = (): void => {
    const s = picker.current();
    coordSel.replaceChildren(...Array.from({ length: s.m }, (_, i) => h('option', { value: String(i) }, `output bit ${i}`)));
    coordSel.value = '0';
  };

  const render = (): void => {
    const s = picker.current();
    const i = Number(coordSel.value);
    const metric = degreeMetric(s);
    const anf = anfCoordinate(s, i);
    const terms = Array.from(anf.keys()).filter((u) => anf[u]);
    clear(summary);
    summary.append(
      h(
        'div',
        { class: 'table-wrap', role: 'region', tabindex: '0', 'aria-label': 'Degree of each output bit' },
        h(
          'table',
          { class: 'kat-table compact' },
          h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Output bit'), h('th', { scope: 'col' }, 'Degree'), h('th', { scope: 'col' }, 'ANF terms'))),
          h(
            'tbody',
            {},
            ...metric.perCoordinate.map((d, k) => {
              const a = anfCoordinate(s, k);
              return h('tr', {}, h('td', {}, String(k)), h('td', {}, String(d)), h('td', {}, String(a.reduce((x, y) => x + y, 0))));
            }),
          ),
        ),
      ),
      h(
        'p',
        { class: 'readout' },
        'Algebraic degree of the S-box (largest over its output bits): ',
        h('strong', { 'data-claim': 'degree' }, String(metric.value)),
        `. Bound: ${metric.boundText}. `,
        toneChip(metric.tone, metric.verdict, 'degree'),
      ),
      s.n <= 5
        ? h('p', { class: 'eq-derivation', 'data-claim': 'anf' }, `bit ${i} = ${terms.length ? terms.map(monomialName).join(' ⊕ ') : '0'}`)
        : h(
            'p',
            {},
            `Bit ${i} has ${terms.length} terms; by degree: ` +
              Array.from({ length: s.n + 1 }, (_, d) => `${d}: ${terms.filter((u) => popcount(u) === d).length}`).join(', ') +
              '.',
          ),
    );
    renderStepper();
  };

  const renderStepper = (): void => {
    const s = picker.current();
    clear(stepOut);
    if (s.n > 5) {
      nextBtn.disabled = true;
      resetBtn.disabled = true;
      progress.textContent = 'Stepper shows n ≤ 5';
      stepOut.append(
        h('p', { class: 'help' }, `The stepper lays out all ${1 << s.n} entries per stage only for n ≤ 5. The ${s.n}-bit result above comes from the same transform; pick a smaller S-box to watch it.`),
      );
      return;
    }
    const i = Number(coordSel.value);
    const stages = mobiusStages(s, i);
    nextBtn.disabled = stage >= s.n;
    resetBtn.disabled = stage === 0;
    progress.textContent = `Stage ${stage} / ${s.n}`;
    const nw = hexWidth(s.n);
    const head = h('tr', {}, h('th', { scope: 'col' }, 'x / u'), ...Array.from({ length: stage + 1 }, (_, k) => h('th', { scope: 'col' }, k === 0 ? 'f(x)' : `after stage ${k}`)));
    const body = Array.from({ length: 1 << s.n }, (_, x) =>
      h(
        'tr',
        {},
        h('th', { scope: 'row' }, `${hex(x, nw)} (${x.toString(2).padStart(s.n, '0')})`),
        ...Array.from({ length: stage + 1 }, (_, k) => h('td', { class: k === stage ? 'cell-current' : '' }, String(stages[k][x]))),
      ),
    );
    stepOut.append(
      h('p', { class: 'help' }, stage === 0 ? 'Stage 0 is the truth table of the chosen output bit. Each stage k XORs into every u with bit k set the value at u with that bit cleared.' : `Stage ${stage} folded input bit x${stage} in.`),
      h(
        'div',
        { class: 'table-wrap', role: 'region', tabindex: '0', 'aria-label': 'Möbius transform stages' },
        h('table', { class: 'kat-table compact stage-table' }, h('thead', {}, head), h('tbody', {}, ...body)),
      ),
    );
    if (stage === s.n) {
      const direct = anfCoordinate(s, i);
      const same = stages[s.n].every((v, u) => v === direct[u]);
      stepOut.append(
        same
          ? verdict('pass', `After ${s.n} stages the column is the ANF: a 1 at row u means the product of the input bits set in u is a term. Degree ${degreeOf(direct)}, matching the table above.`)
          : verdict('fail', 'The stepped result disagrees with the full transform.'),
      );
    }
  };

  coordSel.addEventListener('change', () => {
    stage = 0;
    render();
  });
  nextBtn.addEventListener('click', () => {
    stage++;
    renderStepper();
  });
  resetBtn.addEventListener('click', () => {
    stage = 0;
    renderStepper();
  });

  root.append(
    h(
      'div',
      { class: 'controls' },
      picker.root,
      h('div', { class: 'control' }, h('label', { for: 'deg-coord' }, 'Output bit'), h('div', { class: 'select-wrap' }, coordSel)),
    ),
    summary,
    h('h3', {}, 'Watch the Möbius transform build the ANF'),
    h('div', { class: 'stepper-controls' }, nextBtn, resetBtn, progress),
    stepOut,
  );
  fill();
  render();
}
