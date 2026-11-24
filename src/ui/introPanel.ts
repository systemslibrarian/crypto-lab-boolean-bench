import { analyse } from '../boolean/metrics';
import { validateSBox } from '../boolean/types';
import { affineStartTable, formatTable, inverse4Table } from '../sboxes/catalog';
import { clear, h, note, panelIntro, toneChip } from './dom';

export function renderIntroPanel(root: HTMLElement): void {
  root.append(
    panelIntro(
      'What an S-box must do',
      'In AES, byte substitution introduces nonlinearity. Its S-box is a small lookup table that maps each input byte to an output byte.',
      'Looking scrambled is not the same as being scrambled. Below are two 4-bit S-boxes. Both are permutations of 0 … f, and both look like random shuffles. One of them is affine — a disguised XOR — and each output bit is an XOR of selected input bits and a constant.',
    ),
  );
  const a = validateSBox('i-aff', 'S-box A', 4, 4, affineStartTable());
  const b = validateSBox('i-inv', 'S-box B', 4, 4, inverse4Table());
  const out = h('div', { class: 'output', role: 'status' });
  const btn = h('button', { class: 'btn btn-primary', type: 'button', id: 'intro-measure' }, 'Measure them') as HTMLButtonElement;
  btn.addEventListener('click', () => {
    clear(out);
    for (const s of [a, b]) {
      const r = analyse(s);
      out.append(
        h(
          'div',
          { class: 'sig-card' },
          h('h3', {}, s.name),
          h('p', {}, 'Nonlinearity ', h('strong', {}, String(r.nl.value)), ' ', toneChip(r.nl.tone, r.nl.verdict, `intro-${s.id}-nl`)),
          h('p', {}, 'δ ', h('strong', {}, String(r.delta.value)), ' ', toneChip(r.delta.tone, r.delta.verdict, `intro-${s.id}-delta`)),
        ),
      );
    }
    out.append(
      note(
        'info',
        'S-box A is S(x) = rotl(x, 1) ⊕ 3. An affine component agrees with an affine guess at every input, so its nonlinearity is zero. S-box B uses inversion in GF(2⁴). The AES S-box uses inversion in GF(2⁸) followed by an affine transformation.',
      ),
    );
  });
  root.append(
    h(
      'div',
      { class: 'sig-pair' },
      h('div', { class: 'sig-card' }, h('h3', {}, 'S-box A'), h('code', { class: 'field-value' }, formatTable(a.table, 1))),
      h('div', { class: 'sig-card' }, h('h3', {}, 'S-box B'), h('code', { class: 'field-value' }, formatTable(b.table, 1))),
    ),
    h('p', {}, 'Predict before measuring: if a component is affine, how many entries must change before it agrees exactly with an affine function?'),
    h('div', { class: 'action-row spaced' }, btn),
    out,
    h('h3', {}, 'The three numbers this bench measures'),
    h(
      'ul',
      { class: 'plain-list' },
      h('li', {}, h('strong', {}, 'Nonlinearity'), ' — how far every linear guess about the output stays from being right. Bigger is better. (Walsh spectrum tab.)'),
      h('li', {}, h('strong', {}, 'Differential uniformity δ'), ' — how often the best guess about an output difference wins. Smaller is better. (Difference table tab.)'),
      h('li', {}, h('strong', {}, 'Algebraic degree'), ' — the largest product of input bits an output bit needs. Degree 1 means affine. (Algebraic degree tab.)'),
    ),
    note(
      'caveat',
      'Not production cryptography — a teaching bench. Every number is computed in your browser from the table on screen; nothing is looked up. These are properties of one S-box, not a verdict on any cipher.',
    ),
  );
}
