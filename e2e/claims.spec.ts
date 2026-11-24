import { expect, test, type Page } from '@playwright/test';
import { boot } from './gate';

/**
 * The claims suite (§4.1b): what this lab's interface SAYS, checked by
 * re-deriving it — from values the page printed, by a route the source does
 * not take — rather than against a hardcoded string wherever the maths allows.
 *
 * The in-test arithmetic below (parity, GF(2^5) multiply, difference counts,
 * Möbius) is written here on purpose, separately from src/, so a test cannot
 * agree with a bug by recomputing the same expression the page uses.
 */

const par = (v: number): number => {
  let p = 0;
  for (let x = v; x; x >>= 1) p ^= x & 1;
  return p;
};
/** GF(2^5) mod x^5 + x^2 + 1, written independently of src/gf. */
const mul32 = (a: number, b: number): number => {
  let r = 0;
  for (let i = 0; i < 5; i++) if ((b >> i) & 1) r ^= a << i;
  for (let i = 8; i >= 5; i--) if ((r >> i) & 1) r ^= 0x25 << (i - 5);
  return r;
};
const gold = Array.from({ length: 32 }, (_, x) => mul32(mul32(x, x), x));
const deltaOf = (t: number[], n: number): number => {
  let best = 0;
  for (let a = 1; a < 1 << n; a++) {
    const counts = new Map<number, number>();
    for (let x = 0; x < 1 << n; x++) {
      const d = t[x] ^ t[x ^ a];
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    best = Math.max(best, ...counts.values());
  }
  return best;
};
const num = async (page: Page, sel: string): Promise<number> => Number((await page.locator(sel).first().innerText()).trim());

async function openTab(page: Page, name: RegExp): Promise<void> {
  await page.getByRole('tab', { name }).click();
  await expect(page.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
}

test.describe('displayed claims', () => {
  test('Walsh headline: NL = 2^(n−1) − max|W|/2, with max|W| re-read from the printed coefficients', async ({ page }) => {
    await boot(page, 'dark');
    await openTab(page, /Walsh spectrum/);
    const maxw = await num(page, '[data-claim="maxw"]');
    const nl = await num(page, '[data-claim="nl-component"]');
    expect(nl).toBe(128 - maxw / 2);
    // Independent route: open the full table and take the max ourselves.
    await page.locator('#panel-walsh details.disclosure > summary').click();
    const cells = await page.locator('#panel-walsh details.disclosure tbody tr td:nth-child(2)').allInnerTexts();
    expect(cells).toHaveLength(256);
    const fromTable = Math.max(...cells.map((c) => Math.abs(parseInt(c, 10))));
    expect(fromTable).toBe(maxw);
    // FIPS-197 AES: every component has NL 112, so the vectorial NL printed is 112.
    await expect(page.locator('[data-claim="nl-vectorial"]')).toHaveText('112');
  });

  test('counting check: agree + disagree = 2^n, and agree − disagree is the printed W(a)', async ({ page }) => {
    await boot(page, 'dark');
    await openTab(page, /Walsh spectrum/);
    await page.locator('#walsh-sbox').selectOption('gold');
    await page.locator('#walsh-a').fill('5');
    const agree = await num(page, '[data-claim="agree"]');
    const disagree = await num(page, '[data-claim="disagree"]');
    expect(agree + disagree).toBe(32);
    expect(await num(page, '[data-claim="w-count"]')).toBe(agree - disagree);
    expect(await num(page, '[data-claim="w-fwht"]')).toBe(agree - disagree);
    // Recount from the bit strip the page drew, row by row.
    const sb = await page.locator('#panel-walsh table.bits tr').nth(1).locator('td').allInnerTexts();
    const ax = await page.locator('#panel-walsh table.bits tr').nth(2).locator('td').allInnerTexts();
    const agreeHere = sb.filter((v, i) => v === ax[i]).length;
    expect(agreeHere).toBe(agree);
    // And from first principles: a = 5, the mask in use, applied to x.
    const b = Number(await page.locator('#walsh-mask').inputValue());
    let a2 = 0;
    for (let x = 0; x < 32; x++) a2 += par(b & gold[x]) === par(5 & x) ? 1 : 0;
    expect(a2).toBe(agree);
  });

  test('difference table: δ printed for S-box B equals δ recomputed from the table the intro prints', async ({ page }) => {
    await boot(page, 'dark');
    const text = await page.locator('#panel-intro .sig-card code').nth(1).innerText();
    const table = text.trim().split(/\s+/).map((t) => parseInt(t, 16));
    expect(table).toHaveLength(16);
    const expected = deltaOf(table, 4);
    await openTab(page, /Difference table/);
    await page.locator('#ddt-sbox').selectOption('inv4');
    expect(await num(page, '[data-claim="delta"]')).toBe(expected);
    expect(expected).toBe(4);
  });

  test('a difference-table row sums to 2^n (every input lands in exactly one cell)', async ({ page }) => {
    await boot(page, 'dark');
    await openTab(page, /Difference table/);
    const cells = await page.locator('#panel-ddt .heat-table').first().locator('tbody td').allInnerTexts();
    expect(cells).toHaveLength(256);
    expect(cells.map((c) => parseInt(c, 10)).reduce((x, y) => x + y, 0)).toBe(256);
  });

  test('degree: the ANF the stepper reaches is the ANF recomputed here from the Gold map', async ({ page }) => {
    await boot(page, 'dark');
    await openTab(page, /Algebraic degree/);
    // Möbius, written here, on bit 0 of x³ over GF(2^5).
    const c = gold.map((y) => y & 1);
    for (let h = 1; h < 32; h <<= 1) for (let x = 0; x < 32; x++) if (x & h) c[x] ^= c[x ^ h];
    const terms = c
      .map((v, u) => (v ? u : -1))
      .filter((u) => u >= 0)
      .map((u) => (u === 0 ? '1' : Array.from({ length: 5 }, (_, k) => ((u >> k) & 1 ? `x${k + 1}` : '')).join('')));
    await expect(page.locator('[data-claim="anf"]')).toHaveText(`bit 0 = ${terms.join(' ⊕ ')}`);
    await expect(page.locator('[data-claim="degree"]')).toHaveText('2');
    for (let i = 1; i <= 5; i++) await page.getByRole('button', { name: 'Next stage' }).click();
    const last = await page.locator('#panel-degree .stage-table tbody tr td:last-child').allInnerTexts();
    expect(last.map(Number)).toEqual(c);
  });

  test('the negative claim: the APN Gold map scores optimal on every check, and the page says that is not a cipher', async ({ page }) => {
    await boot(page, 'dark');
    await openTab(page, /Side by side/);
    const fixture = page.locator('#gold-fixture');
    // 1. Reached. 2. Every verdict rendered in the fixture reports success.
    const tones = await fixture.locator('[data-tone]').evaluateAll((els) => els.map((e) => e.getAttribute('data-tone')));
    expect(tones).toEqual(['optimal', 'optimal', 'optimal']);
    await expect(fixture.locator('.verdict-fail, .verdict-alarm, [data-tone="alarm"]')).toHaveCount(0);
    // The table row agrees with an independent count: δ(x³ over GF(2^5)) = 2.
    expect(deltaOf(gold, 5)).toBe(2);
    await expect(page.locator('tr[data-sbox="gold"] [data-claim="delta-value"]')).toHaveText('2');
    // 3. The limitation is on screen, in that state, tied to the fixture.
    const claim = fixture.locator('[data-negative-claim="gold"]');
    await expect(claim).toBeVisible();
    await expect(claim).toContainText('OPTIMAL DIFFERENTIALLY — AND THIS IS NOT A CIPHER');
    await expect(claim).toContainText('A perfect score here is not a secure cipher.');
    await expect(claim).toContainText('they say nothing about the key schedule, the number of rounds or the rest of the design');
  });

  test('the toy cipher: the recovered key really re-encrypts the second pair (recomputed here)', async ({ page }) => {
    await boot(page, 'dark');
    await openTab(page, /Side by side/);
    await page.locator('#toy-run').click();
    await expect(page.locator('#gold-fixture .verdict-alarm')).toContainText('KEY RECOVERED');
    const lines = await page.locator('#gold-fixture .eq-derivation').allInnerTexts();
    const [, pHex, cHex] = /p = ([0-9a-f]{2}), c = S\(p ⊕ k\) = ([0-9a-f]{2})/.exec(lines[0])!;
    const k = parseInt((await page.locator('[data-claim="toy-key"]').innerText()).trim(), 16);
    expect(gold[parseInt(pHex, 16) ^ k]).toBe(parseInt(cHex, 16));
  });

  test('editing the table retires the measurements, and the page says it did', async ({ page }) => {
    await boot(page, 'dark');
    await openTab(page, /Side by side/);
    await expect(page.locator('[data-claim="editor-nl"]')).toHaveText('0');
    await page.locator('#editor-table').fill('9 1 7 5 b 3 f d 2 0 6 4 a 8 e c');
    await expect(page.locator('[data-claim="editor-nl"]')).toHaveCount(0);
    await expect(page.locator('#editor-out .evidence-retired')).toContainText('retired');
    await page.locator('#editor-analyse').click();
    await expect(page.locator('#editor-out .evidence-retired')).toHaveCount(0);
    await expect(page.locator('[data-claim="editor-nl"]')).toHaveText('0');
  });

  test('re-selecting the same S-box does not retire a current result', async ({ page }) => {
    await boot(page, 'dark');
    await openTab(page, /Walsh spectrum/);
    const readout = page.locator('#panel-walsh .readout');
    await readout.evaluate((el) => el.setAttribute('data-sentinel', 'kept'));
    await page.locator('#walsh-sbox').evaluate((el: HTMLSelectElement) => {
      el.value = 'aes';
      el.dispatchEvent(new Event('change'));
    });
    await expect(page.locator('#panel-walsh .readout[data-sentinel="kept"]')).toHaveCount(1);
    await page.locator('#walsh-sbox').selectOption('gold');
    await expect(page.locator('#panel-walsh .readout[data-sentinel="kept"]')).toHaveCount(0);
  });

  test('the comparison table prints the FIPS 197 AES results: NL 112, δ 4, degree 7', async ({ page }) => {
    await boot(page, 'dark');
    await openTab(page, /Side by side/);
    const row = page.locator('tr[data-sbox="aes"]');
    await expect(row.locator('[data-claim="nl-value"]')).toHaveText('112');
    await expect(row.locator('[data-claim="delta-value"]')).toHaveText('4');
    await expect(row.locator('[data-claim="degree-value"]')).toHaveText('7');
  });

  test('a selected edited table refreshes in the degree panel after re-analysis', async ({ page }) => {
    await boot(page, 'dark');
    await openTab(page, /Side by side/);
    await openTab(page, /Algebraic degree/);
    await page.locator('#deg-sbox').selectOption('edited');
    await expect(page.locator('[data-claim="degree"]')).toHaveText('1');
    await openTab(page, /Side by side/);
    await page.locator('#editor-table').fill('0 0 0 1');
    await page.locator('#editor-analyse').click();
    await openTab(page, /Algebraic degree/);
    await expect(page.locator('[data-claim="degree"]')).toHaveText('2');
  });

  test('the intro tells the affine S-box apart: A is ALARM on nonlinearity, B is not', async ({ page }) => {
    await boot(page, 'dark');
    await expect(page.locator('#panel-intro')).toContainText('Predict before measuring');
    await page.locator('#intro-measure').click();
    await expect(page.locator('[data-verdict="intro-i-aff-nl"]')).toHaveAttribute('data-tone', 'alarm');
    await expect(page.locator('[data-verdict="intro-i-inv-nl"]')).not.toHaveAttribute('data-tone', 'alarm');
    await expect(page.locator('#panel-intro .callout-info')).toContainText('rotl(x, 1) ⊕ 3');
    await expect(page.locator('#panel-intro .callout-info')).toContainText('followed by an affine transformation');
  });
});
