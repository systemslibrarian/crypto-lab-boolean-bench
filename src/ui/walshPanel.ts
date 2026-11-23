import { componentNonlinearity, maxAbs, nonlinearity, walshByCounting, walshSpectrum } from '../boolean/walsh';
import { parity, type SBox } from '../boolean/types';
import { nlBound } from '../boolean/metrics';
import { clear, h, hex, hexWidth, note, panelIntro, toneChip, verdict } from './dom';
import { sboxPicker } from './picker';

const SVG = 'http://www.w3.org/2000/svg';

function svg(tag: string, attrs: Record<string, string | number>): SVGElement {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

/** The spectrum as bars around a zero line; every bar at max |W| also carries a marker shape. */
function spectrumChart(w: Int32Array, maxW: number): SVGElement {
  const size = w.length;
  const width = 640;
  const height = 200;
  const mid = height / 2;
  // Scaled to the largest bar so the shape is readable at every size; the
  // ±max labels on the axis keep the scale honest.
  const scale = (mid - 18) / Math.max(maxW, 1);
  const gutter = 34; // room for the axis labels
  const barW = (width - gutter) / size;
  const root = svg('svg', {
    viewBox: `0 0 ${width} ${height}`,
    class: 'spectrum',
    role: 'img',
    'aria-labelledby': 'walsh-chart-title',
  });
  const title = svg('title', { id: 'walsh-chart-title' });
  const atMax = Array.from(w).filter((v) => Math.abs(v) === maxW).length;
  title.textContent = `Walsh spectrum: ${size} coefficients, largest magnitude ${maxW} at ${atMax} input mask${atMax === 1 ? '' : 's'}.`;
  root.append(title);
  root.append(svg('line', { x1: gutter, x2: width, y1: mid, y2: mid, class: 'axis' }));
  for (const [y, label] of [[18, `+${maxW}`], [height - 8, `−${maxW}`], [mid - 4, '0']] as const) {
    const t = svg('text', { x: 2, y, class: 'axis-label' });
    t.textContent = label;
    root.append(t);
  }

  for (let a = 0; a < size; a++) {
    const v = w[a];
    const hgt = Math.abs(v) * scale;
    const isMax = Math.abs(v) === maxW;
    root.append(
      svg('rect', {
        x: gutter + a * barW + barW * 0.1,
        y: v >= 0 ? mid - hgt : mid,
        width: Math.max(barW * 0.8, 0.8),
        height: Math.max(hgt, 0.5),
        class: isMax ? 'bar bar-max' : 'bar',
      }),
    );
    if (isMax) {
      // A triangle beyond the bar's end: the marker is a SHAPE, not only a colour.
      const y = v >= 0 ? mid - hgt - 4 : mid + hgt + 4;
      const cx = gutter + a * barW + barW / 2;
      const dir = v >= 0 ? -1 : 1;
      root.append(
        svg('path', {
          d: `M${cx - 4} ${y} L${cx + 4} ${y} L${cx} ${y + dir * 7} Z`,
          class: 'max-marker',
        }),
      );
    }
  }
  return root;
}

function bitStrip(s: SBox, b: number, a: number): HTMLElement {
  const rows: HTMLElement[] = [];
  const size = 1 << s.n;
  const w = hexWidth(s.n);
  const cells = (fn: (x: number) => string, cls?: (x: number) => string) =>
    Array.from({ length: size }, (_, x) => h('td', { class: cls ? cls(x) : '' }, fn(x)));
  const sb = (x: number) => parity(b & s.table[x]);
  const ax = (x: number) => parity(a & x);
  rows.push(h('tr', {}, h('th', { scope: 'row' }, 'x'), ...cells((x) => hex(x, w))));
  rows.push(h('tr', {}, h('th', { scope: 'row' }, 'b·S(x)'), ...cells((x) => String(sb(x)))));
  rows.push(h('tr', {}, h('th', { scope: 'row' }, 'a·x'), ...cells((x) => String(ax(x)))));
  rows.push(
    h(
      'tr',
      {},
      h('th', { scope: 'row' }, 'agree?'),
      ...cells(
        (x) => (sb(x) === ax(x) ? '=' : '≠'),
        (x) => (sb(x) === ax(x) ? 'cell-agree' : 'cell-disagree'),
      ),
    ),
  );
  return h(
    'div',
    { class: 'table-wrap', role: 'region', tabindex: '0', 'aria-label': 'Bit-by-bit comparison of b·S(x) and a·x' },
    h('table', { class: 'bits' }, h('tbody', {}, ...rows)),
  );
}

export function renderWalshPanel(root: HTMLElement): void {
  root.append(
    panelIntro(
      'Walsh spectrum: how well a line predicts the S-box',
      'A linear approximation guesses one bit of the output, b·S(x), from one bit of the input, a·x (each "·" is the parity of the bits a mask selects). The Walsh coefficient W(a) counts how often that guess is right minus how often it is wrong, over every input.',
      'W(a) = 0 means the guess is a coin toss; a large |W(a)| is a bias an attacker can use. Nonlinearity is the distance to the best guess: NL = 2^(n−1) − max|W|/2.',
    ),
  );

  const maskSel = h('select', { id: 'walsh-mask', class: 'select' }) as HTMLSelectElement;
  const aInput = h('input', {
    id: 'walsh-a',
    class: 'mono-input',
    type: 'text',
    inputmode: 'text',
    autocomplete: 'off',
    spellcheck: 'false',
    'aria-describedby': 'walsh-a-help',
  }) as HTMLInputElement;
  const out = h('div', { class: 'output', 'aria-live': 'polite' });
  const countOut = h('div', { class: 'output' });

  const picker = sboxPicker('walsh-sbox', 'aes', () => {
    fillMasks();
    render();
  });

  const fillMasks = (): void => {
    const s = picker.current();
    const w = hexWidth(s.m);
    maskSel.replaceChildren(
      ...Array.from({ length: (1 << s.m) - 1 }, (_, i) => h('option', { value: String(i + 1) }, `b = ${hex(i + 1, w)}`)),
    );
    // Start on the mask that achieves the vectorial minimum: the weakest component.
    maskSel.value = String(nonlinearity(s).mask);
  };

  const render = (): void => {
    const s = picker.current();
    const b = Number(maskSel.value);
    const w = walshSpectrum(s, b);
    const { value: maxW, at } = maxAbs(w);
    const comp = componentNonlinearity(s, b);
    const vec = nonlinearity(s);
    const { bound, text } = nlBound(s.n, s.m);
    const nw = hexWidth(s.n);
    const half = 1 << (s.n - 1);
    clear(out);
    out.append(
      h(
        'figure',
        { class: 'chart' },
        spectrumChart(w, maxW),
        h(
          'figcaption',
          {},
          `W(a) for every input mask a = 0 … ${hex((1 << s.n) - 1, nw)}, output mask b = ${hex(b, hexWidth(s.m))}. `,
          h('span', { class: 'legend-max' }, '▼ marks every bar at the largest magnitude.'),
        ),
      ),
      h(
        'div',
        { class: 'readout' },
        h(
          'p',
          {},
          'Largest |W(a)| for this mask: ',
          h('strong', { 'data-claim': 'maxw' }, String(maxW)),
          ` (first at a = ${hex(at, nw)}).`,
        ),
        h(
          'p',
          { class: 'eq-derivation' },
          `NL(b·S) = 2^(n−1) − max|W|/2 = ${half} − ${maxW}/2 = `,
          h('strong', { 'data-claim': 'nl-component' }, String(comp.nl)),
        ),
        h(
          'p',
          {},
          `Every one of the ${(1 << s.m) - 1} nonzero output masks scanned: the vectorial nonlinearity is the smallest, `,
          h('strong', { 'data-claim': 'nl-vectorial' }, String(vec.nl)),
          ` (at b = ${hex(vec.mask, hexWidth(s.m))}). Bound: ${text}. `,
          toneChip(vec.nl === 0 ? 'alarm' : vec.nl >= bound ? 'optimal' : 'ok', vec.nl === 0 ? 'ALARM — affine component' : vec.nl >= bound ? 'OPTIMAL — meets the bound' : `below the bound by ${bound - vec.nl}`, 'walsh-nl'),
        ),
      ),
      h(
        'details',
        { class: 'disclosure' },
        h('summary', {}, `Show all ${1 << s.n} coefficients as a table`),
        h(
          'div',
          { class: 'table-wrap', role: 'region', tabindex: '0', 'aria-label': 'All Walsh coefficients' },
          h(
            'table',
            { class: 'kat-table compact' },
            h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'a'), h('th', { scope: 'col' }, 'W(a)'))),
            h(
              'tbody',
              {},
              ...Array.from(w, (v, a) =>
                h('tr', {}, h('td', {}, hex(a, nw)), h('td', {}, Math.abs(v) === maxW ? `${v} ▼` : String(v))),
              ),
            ),
          ),
        ),
      ),
    );
    if (!aInput.value || !/^[0-9a-f]+$/i.test(aInput.value) || parseInt(aInput.value, 16) >= 1 << s.n) {
      aInput.value = hex(at, nw);
    }
    renderCount();
  };

  const renderCount = (): void => {
    const s = picker.current();
    const b = Number(maskSel.value);
    clear(countOut);
    const raw = aInput.value.trim();
    const a = /^[0-9a-f]+$/i.test(raw) ? parseInt(raw, 16) : NaN;
    if (!Number.isInteger(a) || a < 0 || a >= 1 << s.n) {
      aInput.setAttribute('aria-invalid', 'true');
      countOut.append(verdict('fail', `Input mask: "${raw}" is not a hex value from 0 to ${hex((1 << s.n) - 1, hexWidth(s.n))}.`));
      return;
    }
    aInput.removeAttribute('aria-invalid');
    const byCount = walshByCounting(s, b, a);
    const byButterfly = walshSpectrum(s, b)[a];
    countOut.append(
      h(
        'div',
        { class: 'both-sides' },
        h(
          'p',
          { class: 'both-sides-eq' },
          `Counted over all ${1 << s.n} inputs: `,
          h('strong', { 'data-claim': 'agree' }, String(byCount.agree)),
          ' agree, ',
          h('strong', { 'data-claim': 'disagree' }, String(byCount.disagree)),
          ' disagree, so W(a) = ',
          h('strong', { 'data-claim': 'w-count' }, String(byCount.w)),
          '. The fast Walsh–Hadamard transform gives ',
          h('strong', { 'data-claim': 'w-fwht' }, String(byButterfly)),
          '.',
        ),
        byCount.w === byButterfly
          ? verdict('pass', 'Both routes agree — the butterfly computes exactly this count.')
          : verdict('fail', 'The two routes disagree — the transform is wrong.'),
      ),
    );
    if (s.n <= 5) countOut.append(bitStrip(s, b, a));
    else countOut.append(note('info', `At n = ${s.n} the ${1 << s.n}-column bit strip is left out; pick a 4- or 5-bit S-box to see every input.`));
  };

  maskSel.addEventListener('change', render);
  aInput.addEventListener('input', renderCount);

  root.append(
    h(
      'div',
      { class: 'controls' },
      picker.root,
      h('div', { class: 'control' }, h('label', { for: 'walsh-mask' }, 'Output mask b'), h('div', { class: 'select-wrap' }, maskSel)),
    ),
    out,
    h('h3', {}, 'Count one coefficient by hand'),
    h(
      'div',
      { class: 'controls' },
      h(
        'div',
        { class: 'control' },
        h('label', { for: 'walsh-a' }, 'Input mask a (hex)'),
        aInput,
        h('p', { class: 'help', id: 'walsh-a-help' }, 'Starts at the input mask with the largest |W(a)|. Type any other mask to recount.'),
      ),
    ),
    countOut,
  );
  fillMasks();
  render();
}
