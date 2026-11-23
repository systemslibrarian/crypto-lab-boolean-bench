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
  let currentId = initial;
  const fill = (): void => {
    const keep = currentId;
    select.replaceChildren(
      ...allSBoxes()
        .filter(filter)
        .map((s) => h('option', { value: s.id }, s.name)),
    );
    select.value = keep;
  };
  fill();
  onSBoxesChanged(fill);
  select.addEventListener('change', () => {
    if (select.value === currentId) return;
    currentId = select.value;
    onPick(current());
  });
  const current = (): SBox => allSBoxes().find((s) => s.id === currentId)!;
  const root = h(
    'div',
    { class: 'control' },
    h('label', { for: id }, 'S-box'),
    h('div', { class: 'select-wrap' }, select),
  );
  return { root, select, current };
}
