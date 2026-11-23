import { ddtRow, differentialUniformity, pairsFor } from '../boolean/ddt';
import { deltaBound } from '../boolean/metrics';
import type { SBox } from '../boolean/types';
import { clear, h, hex, hexWidth, panelIntro, toneChip, verdict } from './dom';
import { sboxPicker } from './picker';

/** Lay 2^m counts out 16 to a row, with header digits, each cell number + heat + a ▲ glyph at the maximum. */
function heatTable(values: ArrayLike<number>, m: number, max: number, label: string, rowLabel = 'b'): HTMLElement {
  const cols = Math.min(16, values.length);
  const rows = Math.ceil(values.length / cols);
  const w = hexWidth(m);
  const head = h(
    'tr',
    {},
    h('th', { scope: 'col' }, rowLabel),
    ...Array.from({ length: cols }, (_, c) => h('th', { scope: 'col' }, `+${c.toString(16)}`)),
  );
  const body = Array.from({ length: rows }, (_, r) =>
    h(
      'tr',
      {},
      h('th', { scope: 'row' }, hex(r * cols, w)),
      ...Array.from({ length: cols }, (_, c) => {
        const v = values[r * cols + c];
        const level = max === 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4));
        return h('td', { class: `heat heat-${level}${v === max && v > 0 ? ' heat-top' : ''}` }, v === max && v > 0 ? `${v}▲` : String(v));
      }),
    ),
  );
  return h(
    'div',
    { class: 'table-wrap', role: 'region', tabindex: '0', 'aria-label': label },
    h('table', { class: 'heat-table' }, h('thead', {}, head), h('tbody', {}, ...body)),
  );
}

export function renderDdtPanel(root: HTMLElement): void {
  root.append(
    panelIntro(
      'Difference table: how well an input difference predicts an output difference',
      'Differential cryptanalysis feeds an S-box two inputs that differ by a, and bets on the difference b between the outputs. The difference distribution table counts, for every a and b, how many inputs x make S(x) ⊕ S(x ⊕ a) = b.',
      'If one cell is large, that bet wins often. Differential uniformity δ is the largest cell with a ≠ 0. An n-bit permutation cannot do better than δ = 2, called APN (almost perfect nonlinear).',
    ),
  );
  const aSel = h('select', { id: 'ddt-a', class: 'select' }) as HTMLSelectElement;
  const out = h('div', { class: 'output' });
  const picker = sboxPicker('ddt-sbox', 'aes', () => {
    fill();
    render();
  });
  const worstBtn = h('button', { class: 'btn btn-ghost', type: 'button' }, 'Jump to the worst row') as HTMLButtonElement;

  const fill = (): void => {
    const s = picker.current();
    const w = hexWidth(s.n);
    aSel.replaceChildren(...Array.from({ length: (1 << s.n) - 1 }, (_, i) => h('option', { value: String(i + 1) }, `a = ${hex(i + 1, w)}`)));
    aSel.value = String(differentialUniformity(s).a);
  };

  const pairsBlock = (s: SBox, a: number, b: number): HTMLElement => {
    const xs = pairsFor(s, a, b);
    const nw = hexWidth(s.n);
    const mw = hexWidth(s.m);
    const shown = xs.slice(0, 16);
    const allMatch = xs.every((x) => (s.table[x] ^ s.table[x ^ a]) === b);
    return h(
      'div',
      { class: 'both-sides' },
      h('p', { class: 'both-sides-eq' }, `The ${xs.length} inputs behind the largest cell in this row (a = ${hex(a, nw)}, b = ${hex(b, mw)}):`),
      h(
        'div',
        { class: 'table-wrap', role: 'region', tabindex: '0', 'aria-label': 'Inputs realising the largest cell' },
        h(
          'table',
          { class: 'kat-table compact' },
          h('thead', {}, h('tr', {}, ...['x', 'S(x)', 'x ⊕ a', 'S(x ⊕ a)', 'S(x) ⊕ S(x ⊕ a)'].map((t) => h('th', { scope: 'col' }, t)))),
          h(
            'tbody',
            {},
            ...shown.map((x) =>
              h(
                'tr',
                {},
                h('td', {}, hex(x, nw)),
                h('td', {}, hex(s.table[x], mw)),
                h('td', {}, hex(x ^ a, nw)),
                h('td', {}, hex(s.table[x ^ a], mw)),
                h('td', {}, hex(s.table[x] ^ s.table[x ^ a], mw)),
              ),
            ),
          ),
        ),
      ),
      xs.length > shown.length ? h('p', { class: 'help' }, `… and ${xs.length - shown.length} more.`) : null,
      allMatch
        ? verdict('pass', `Recomputed pair by pair: every row gives ${hex(b, mw)}, so the cell count ${xs.length} is real.`)
        : verdict('fail', 'A listed pair does not produce this difference.'),
    );
  };

  const render = (): void => {
    const s = picker.current();
    const a = Number(aSel.value);
    const row = ddtRow(s, a);
    const rowMax = Math.max(...row);
    const bAt = row.indexOf(rowMax);
    const d = differentialUniformity(s);
    const bound = deltaBound(s.n, s.m);
    clear(out);
    out.append(
      h('p', {}, `Row a = ${hex(a, hexWidth(s.n))}: ${1 << s.m} output differences, counts sum to ${row.reduce((x, y) => x + y, 0)}. ▲ marks the largest count in the row.`),
      heatTable(row, s.m, rowMax, `Difference table row for a = ${hex(a, hexWidth(s.n))}`),
      h(
        'p',
        { class: 'readout' },
        'Largest cell over every a ≠ 0: δ = ',
        h('strong', { 'data-claim': 'delta' }, String(d.delta)),
        ` at a = ${hex(d.a, hexWidth(s.n))}, b = ${hex(d.b, hexWidth(s.m))}. Lower bound δ ≥ ${bound}. `,
        toneChip(
          d.delta >= 1 << s.n ? 'alarm' : d.delta <= bound ? 'optimal' : 'ok',
          d.delta >= 1 << s.n ? 'ALARM — a difference passes with certainty' : d.delta <= bound ? (s.n === s.m && d.delta === 2 ? 'OPTIMAL — APN' : 'OPTIMAL — meets the bound') : `above the bound by ${d.delta - bound}`,
          'ddt-delta',
        ),
      ),
      pairsBlock(s, a, bAt),
    );
    if (s.n <= 4) {
      const full: number[] = [];
      for (let ai = 0; ai < 1 << s.n; ai++) full.push(...ddtRow(s, ai));
      out.append(
        h(
          'details',
          { class: 'disclosure' },
          h('summary', {}, `Show the whole ${1 << s.n} × ${1 << s.m} table`),
          h('p', { class: 'help' }, `Row r holds a = r; columns are b. Row 0 always puts all ${1 << s.n} inputs at b = 0, which is why δ skips it.`),
          fullTable(s),
        ),
      );
    }
  };

  const fullTable = (s: SBox): HTMLElement => {
    const rows: HTMLElement[] = [];
    const max = differentialUniformity(s).delta;
    for (let a = 0; a < 1 << s.n; a++) {
      const row = ddtRow(s, a);
      rows.push(
        h(
          'tr',
          {},
          h('th', { scope: 'row' }, hex(a, hexWidth(s.n))),
          ...Array.from(row, (v) => h('td', { class: a > 0 && v === max ? 'heat heat-4 heat-top' : 'heat heat-0' }, a > 0 && v === max ? `${v}▲` : String(v))),
        ),
      );
    }
    return h(
      'div',
      { class: 'table-wrap', role: 'region', tabindex: '0', 'aria-label': 'The whole difference distribution table' },
      h(
        'table',
        { class: 'heat-table' },
        h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'a \\ b'), ...Array.from({ length: 1 << s.m }, (_, b) => h('th', { scope: 'col' }, hex(b, hexWidth(s.m)))))),
        h('tbody', {}, ...rows),
      ),
    );
  };

  aSel.addEventListener('change', render);
  worstBtn.addEventListener('click', () => {
    aSel.value = String(differentialUniformity(picker.current()).a);
    render();
  });
  root.append(
    h(
      'div',
      { class: 'controls' },
      picker.root,
      h('div', { class: 'control' }, h('label', { for: 'ddt-a' }, 'Input difference a'), h('div', { class: 'select-wrap' }, aSel)),
      h('div', { class: 'action-row' }, worstBtn),
    ),
    out,
  );
  fill();
  render();
}
