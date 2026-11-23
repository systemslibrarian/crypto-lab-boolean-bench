import { expect, test } from '@playwright/test';
import {
  boot,
  driveAllStates,
  expectBaselineNotStale,
  NARROW,
  reportCollected,
  watchPageErrors,
} from './gate';

/**
 * WCAG A/AA regression gate.
 *
 * The lab is driven along everything it teaches: the intro's two look-alike
 * S-boxes before and after measurement; the Walsh spectrum for AES with its
 * coefficient table opened, for the Gold map with its bit strip, with an
 * invalid input mask and a corrected one; the difference table for AES and for
 * GF(2^4) inversion with the whole table open; the Möbius stepper from stage 0
 * to the ANF and disabled for n = 8; the side-by-side table, the Gold fixture
 * and its broken toy cipher; the editor retired, analysing a non-permutation,
 * a constant S-box, a non-hex table and an oversized one; the links panel;
 * three hover states and two focus rings. Every state is scanned at desktop
 * and phone width. See `gate.ts` for why nothing is injected, nothing is
 * revealed from script, and `violations` is not the whole oracle.
 */

for (const theme of ['dark'] as const) {
  test(`no WCAG A/AA violations in ${theme} theme`, async ({ page }) => {
    test.setTimeout(1_800_000);
    const errors = watchPageErrors(page);
    await boot(page, theme);
    await driveAllStates(page, theme);
    expect(errors, errors.join('\n')).toEqual([]);
    expectBaselineNotStale();
    reportCollected();
  });

  test(`no WCAG A/AA violations in ${theme} theme at 380px`, async ({ page }) => {
    test.setTimeout(1_800_000);
    const errors = watchPageErrors(page);
    await page.setViewportSize(NARROW);
    await boot(page, theme);
    await driveAllStates(page, `${theme} @380px`);
    expect(errors, errors.join('\n')).toEqual([]);
    expectBaselineNotStale();
    reportCollected();
  });
}
