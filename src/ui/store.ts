import type { SBox } from '../boolean/types';
import { builtInSBoxes } from '../sboxes/catalog';

/**
 * The S-boxes every panel can choose from: the four built-ins, plus the learner's
 * edited S-box once the Side-by-side editor has produced one. Panels subscribe so
 * their pickers gain the edited S-box the moment it exists.
 */
const builtIns = builtInSBoxes();
let custom: SBox | null = null;
const listeners = new Set<() => void>();

export function allSBoxes(): SBox[] {
  return custom ? [...builtIns, custom] : [...builtIns];
}

export function findSBox(id: string): SBox | undefined {
  return allSBoxes().find((s) => s.id === id);
}

export function setCustom(s: SBox | null): void {
  custom = s;
  listeners.forEach((fn) => fn());
}

export function onSBoxesChanged(fn: () => void): void {
  listeners.add(fn);
}
