import { test } from '@affine-test/kit/playwright';
import { locateFormatBar } from '@affine-test/kit/utils/editor';
import { openHomePage } from '@affine-test/kit/utils/load-page';
import {
  clickNewPageButton,
  waitForEmptyEditor,
} from '@affine-test/kit/utils/page-logic';
import { expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await openHomePage(page);
  await clickNewPageButton(page);
  await waitForEmptyEditor(page);
});

test.describe('Format bar', () => {
  test('should change text color', async ({ page }) => {
    await page.keyboard.press('Enter');

    await page.keyboard.type('hello world');
    await page.keyboard.press('Shift+ArrowLeft');
    await page.keyboard.press('Shift+ArrowLeft');
    await page.keyboard.press('Shift+ArrowLeft');

    const formatBar = locateFormatBar(page);
    await formatBar.locator('.highlight-icon').hover();
    const fgGreenButton = formatBar.locator(
      '[data-testid="var(--affine-text-highlight-foreground-green)"]'
    );
    await fgGreenButton.click();
    const fgColor1 = await fgGreenButton
      .locator('span')
      .evaluate(e => window.getComputedStyle(e).getPropertyValue('color'));

    const paragraph = page.locator('affine-paragraph');
    const textSpan = paragraph.getByText('rld');
    await expect(textSpan).toBeVisible();
    const fgColor2 = await textSpan.evaluate(e =>
      window.getComputedStyle(e).getPropertyValue('color')
    );

    expect(fgColor1).toBe(fgColor2);
  });

  test('should change text background color', async ({ page }) => {
    await page.keyboard.press('Enter');

    await page.keyboard.type('hello world');
    await page.keyboard.press('Shift+ArrowLeft');
    await page.keyboard.press('Shift+ArrowLeft');
    await page.keyboard.press('Shift+ArrowLeft');

    const formatBar = locateFormatBar(page);
    await formatBar.locator('.highlight-icon').hover();

    const fgGreenButton = formatBar.locator(
      '[data-testid="var(--affine-text-highlight-foreground-green)"]'
    );
    await fgGreenButton.click();
    const fgColor1 = await fgGreenButton
      .locator('span')
      .evaluate(e => window.getComputedStyle(e).getPropertyValue('color'));

    const paragraph = page.locator('affine-paragraph');
    const text1Span = paragraph.getByText('rld');
    const fgColor2 = await text1Span.evaluate(e =>
      window.getComputedStyle(e).getPropertyValue('color')
    );

    expect(fgColor1).toBe(fgColor2);

    await page.keyboard.press('Shift+ArrowLeft');
    await page.keyboard.press('Shift+ArrowLeft');

    await formatBar.locator('.highlight-icon').hover();

    const bgYellowButton = formatBar.locator(
      '[data-testid="var(--affine-text-highlight-yellow)"]'
    );
    await bgYellowButton.click();
    const bgColor1 = await bgYellowButton
      .locator('span')
      .evaluate(e => window.getComputedStyle(e).getPropertyValue('background'));

    const text2Span = paragraph.getByText('world');
    const bgColor2 = await text2Span.evaluate(e =>
      window.getComputedStyle(e).getPropertyValue('background')
    );

    expect(bgColor1).toBe(bgColor2);
  });
});
