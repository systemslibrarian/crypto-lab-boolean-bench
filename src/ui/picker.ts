import type { SBox } from '../boolean/types';
import { h } from './dom';
import { allSBoxes, onSBoxesChanged } from './store';

/**
 * A labelled S-box <select> that keeps its options in step with the store.
 * `onPick` fires only when the CHOICE changes — re-selecting the same S-box is
 * a no-op, so it never retires a verdict that is still current.
 */
export function sboxPicker(
  id: string,
  initial: string,
  onPick: (s: SBox) => void,
  filter: (s: SBox) => boolean = () => true,
): { root: HTMLElement; select: HTMLSelectElement; current: () => SBox } {
  const select = h('select', { id, class: 'select' }) as HTMLSelectElement;
  let selection = allSBoxes().find((s) => s.id === initial)!;
  const fill = (): void => {
    const choices = allSBoxes().filter(filter);
    select.replaceChildren(
      ...choices.map((s) => h('option', { value: s.id }, s.name)),
    );
    const next = choices.find((s) => s.id === selection.id) ?? choices[0];
    select.value = next.id;
    if (next !== selection) {
      selection = next;
      onPick(next);
    }
  };
  fill();
  onSBoxesChanged(fill);
  select.addEventListener('change', () => {
    if (select.value === selection.id) return;
    selection = allSBoxes().find((s) => s.id === select.value)!;
    onPick(selection);
  });
  const current = (): SBox => selection;
  const root = h(
    'div',
    { class: 'control' },
    h('label', { for: id }, 'S-box'),
    h('div', { class: 'select-wrap' }, select),
  );
  return { root, select, current };
}
