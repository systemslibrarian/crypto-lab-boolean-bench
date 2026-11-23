/** Tiny, dependency-free DOM helpers shared by the panels. */

type Attrs = Record<string, string | number | boolean | EventListener | undefined>;
type Child = Node | string | null | undefined;

/** Hyperscript: h('button', { class: 'x', onclick: fn }, 'label'). */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (key === 'class') {
      node.className = String(value);
    } else if (value === true) {
      node.setAttribute(key, '');
    } else {
      node.setAttribute(key, String(value));
    }
  }
  for (const c of children) {
    if (c == null) continue;
    node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

export function clear(node: HTMLElement): void {
  node.replaceChildren();
}

/** A labelled read-only value shown as wrapping monospace (no scroll region needed). */
export function field(label: string, value: string, opts: { mono?: boolean; sub?: string } = {}): HTMLElement {
  return h(
    'div',
    { class: 'field' },
    h('span', { class: 'field-label' }, label, opts.sub ? h('span', { class: 'field-sub' }, ` ${opts.sub}`) : null),
    h('code', { class: opts.mono === false ? 'field-value plain' : 'field-value' }, value),
  );
}

/** A big pass/fail verdict: icon + text + color (never color alone). */
export function verdict(state: 'pass' | 'fail' | 'alarm', text: string): HTMLElement {
  const icon = state === 'pass' ? '✓' : state === 'alarm' ? '⚠' : '✕';
  return h(
    'div',
    { class: `verdict verdict-${state}`, role: 'status' },
    h('span', { class: 'verdict-icon', 'aria-hidden': 'true' }, icon),
    h('span', {}, text),
  );
}

/** Section heading + intro paragraph(s) for a panel. */
export function panelIntro(title: string, ...paras: (string | HTMLElement)[]): HTMLElement {
  return h(
    'div',
    { class: 'panel-intro' },
    h('h2', {}, title),
    ...paras.map((p) => (typeof p === 'string' ? h('p', {}, p) : p)),
  );
}

/** A "not production" / scoping note. */
export function note(kind: 'info' | 'danger' | 'caveat', ...children: Child[]): HTMLElement {
  return h('p', { class: `callout callout-${kind}` }, ...children);
}

/** Replace evidence that no longer belongs to the controls currently on screen. */
export function evidenceRetired(text: string): HTMLElement {
  return h(
    'p',
    { class: 'callout callout-caveat evidence-retired', role: 'status', 'aria-live': 'polite' },
    text,
  );
}


/** A metric verdict chip: icon + words + tone class (never colour alone). */
export function toneChip(tone: 'optimal' | 'ok' | 'alarm', text: string, key: string): HTMLElement {
  const icon = tone === 'optimal' ? '✓' : tone === 'alarm' ? '⚠' : '•';
  return h(
    'span',
    { class: `tone tone-${tone}`, 'data-verdict': key, 'data-tone': tone },
    h('span', { class: 'tone-icon', 'aria-hidden': 'true' }, icon),
    h('span', {}, text),
  );
}

export function hex(v: number, width: number): string {
  return v.toString(16).padStart(width, '0');
}

/** Hex digits needed to print an m-bit value. */
export function hexWidth(bits: number): number {
  return Math.max(1, Math.ceil(bits / 4));
}
