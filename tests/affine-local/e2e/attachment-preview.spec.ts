import { Path, test } from '@affine-test/kit/playwright';
import { openHomePage } from '@affine-test/kit/utils/load-page';
import {
  clickNewPageButton,
  getBlockSuiteEditorTitle,
  waitForEditorLoad,
  waitForEmptyEditor,
} from '@affine-test/kit/utils/page-logic';
import {
  confirmExperimentalPrompt,
  openEditorSetting,
  openExperimentalFeaturesPanel,
} from '@affine-test/kit/utils/setting';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

const fixturesDir = Path.dir(import.meta.url).join('../../fixtures');

async function clickPeekViewControl(page: Page, n = 0) {
  await page.getByTestId('peek-view-control').nth(n).click();
  await page.waitForTimeout(500);
}

async function enablePDFEmbedView(page: Page) {
  // Opens settings panel
  await openEditorSetting(page);
  await openExperimentalFeaturesPanel(page);
  await confirmExperimentalPrompt(page);

  const settingModal = page.locator('[data-testid=setting-modal-content]');
  const item = settingModal.locator('div').getByText('PDF embed preview');
  await item.waitFor({ state: 'attached' });
  await expect(item).toBeVisible();
  const button = item.locator('label');
  const isChecked = await button.locator('input').isChecked();
  if (!isChecked) {
    await button.click();
  }

  // Closes settings panel
  await page.keyboard.press('Escape');
}

async function insertAttachment(page: Page, filepath: string) {
  await page.evaluate(() => {
    // Force fallback to input[type=file] in tests
    // See https://github.com/microsoft/playwright/issues/8850
    window.showOpenFilePicker = undefined;
  });

  const fileChooser = page.waitForEvent('filechooser');

  // open slash menu
  await page.keyboard.type('/attachment', { delay: 50 });
  await page.keyboard.press('Enter');

  await (await fileChooser).setFiles(filepath);
}

test('attachment preview should be shown', async ({ page }) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await clickNewPageButton(page);
  const title = getBlockSuiteEditorTitle(page);
  await title.click();
  await page.keyboard.press('Enter');

  await insertAttachment(page, fixturesDir.join('lorem-ipsum.pdf').value);

  await page.locator('affine-attachment').first().dblclick();

  const attachmentViewer = page.getByTestId('pdf-viewer');
  await expect(attachmentViewer).toBeVisible();

  await page.waitForTimeout(500);

  const pageCursor = attachmentViewer.locator('.page-cursor');
  expect(await pageCursor.textContent()).toBe('1');
  const pageCount = attachmentViewer.locator('.page-count');
  expect(await pageCount.textContent()).toBe('3');

  const thumbnails = attachmentViewer.locator('.thumbnails');
  await thumbnails.locator('button').click();

  await page.waitForTimeout(500);

  expect(
    await thumbnails
      .getByTestId('virtuoso-item-list')
      .locator('[data-item-index]')
      .count()
  ).toBe(3);

  await clickPeekViewControl(page);
  await expect(attachmentViewer).not.toBeVisible();
});

test('attachment preview can be expanded', async ({ page }) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await clickNewPageButton(page);
  const title = getBlockSuiteEditorTitle(page);
  await title.click();
  await page.keyboard.press('Enter');

  await insertAttachment(page, fixturesDir.join('lorem-ipsum.pdf').value);

  await page.locator('affine-attachment').first().dblclick();

  const attachmentViewer = page.getByTestId('pdf-viewer');

  await page.waitForTimeout(500);

  await expect(attachmentViewer).toBeVisible();

  await clickPeekViewControl(page, 1);

  await page.waitForTimeout(500);

  const pageCursor = attachmentViewer.locator('.page-cursor');
  expect(await pageCursor.textContent()).toBe('1');
  const pageCount = attachmentViewer.locator('.page-count');
  expect(await pageCount.textContent()).toBe('3');

  const thumbnails = attachmentViewer.locator('.thumbnails');
  await thumbnails.locator('button').click();

  await page.waitForTimeout(500);

  expect(
    await thumbnails
      .getByTestId('virtuoso-item-list')
      .locator('[data-item-index]')
      .count()
  ).toBe(3);
});

test('should preview PDF in embed view', async ({ page }) => {
  await openHomePage(page);
  await clickNewPageButton(page);
  await waitForEmptyEditor(page);

  const title = getBlockSuiteEditorTitle(page);
  await title.click();
  await page.keyboard.type('PDF preview');

  await enablePDFEmbedView(page);

  await clickNewPageButton(page);
  await waitForEmptyEditor(page);

  await title.click();
  await page.keyboard.type('PDF page');

  await page.keyboard.press('Enter');

  await insertAttachment(page, fixturesDir.join('lorem-ipsum.pdf').value);

  const attachment = page.locator('affine-attachment');
  await attachment.hover();

  const attachmentToolbar = page.locator('.affine-attachment-toolbar');
  await expect(attachmentToolbar).toBeVisible();

  // Switches to embed view
  await attachmentToolbar.getByRole('button', { name: 'Switch view' }).click();
  await attachmentToolbar.getByRole('button', { name: 'Embed view' }).click();

  await page.waitForTimeout(500);

  const portal = attachment.locator('lit-react-portal');
  await expect(portal).toBeVisible();

  await attachment.click();

  await page.waitForTimeout(500);

  const pageCursor = portal.locator('.page-cursor');
  expect(await pageCursor.textContent()).toBe('1');
  const pageCount = portal.locator('.page-count');
  expect(await pageCount.textContent()).toBe('3');

  const prevButton = portal.getByRole('button', { name: 'Prev' });
  const nextButton = portal.getByRole('button', { name: 'Next' });

  await nextButton.click();
  expect(await pageCursor.textContent()).toBe('2');

  await nextButton.click();
  expect(await pageCursor.textContent()).toBe('3');

  await prevButton.click();
  expect(await pageCursor.textContent()).toBe('2');

  // Title alias
  {
    await page.keyboard.press('Enter');

    await page.keyboard.press('@');

    const doc0 = page.locator('.linked-doc-popover').getByText('PDF preview');
    await doc0.click();

    await page.keyboard.press('@');

    const doc1 = page.locator('.linked-doc-popover').getByText('PDF page');
    await doc1.click();

    const inlineLink = page.locator('affine-reference').nth(0);
    const inlineToolbar = page.locator('reference-popup');
    const inlineTitle = inlineLink.locator('.affine-reference-title');

    await expect(inlineTitle).toHaveText('PDF preview');

    const bouding = await inlineLink.boundingBox();
    expect(bouding).not.toBeNull();

    await page.mouse.move(bouding!.x - 50, bouding!.y + bouding!.height / 2);
    await page.waitForTimeout(500);
    await page.mouse.click(bouding!.x - 50, bouding!.y + bouding!.height / 2);

    await inlineLink.hover({ timeout: 500 });

    // Edits title
    await inlineToolbar.getByRole('button', { name: 'Edit' }).click();

    // Title alias
    await page.keyboard.type('PDF embed preview');
    await page.keyboard.press('Enter');

    await expect(inlineTitle).toHaveText('PDF embed preview');
  }

  // PDF embed view should not be re-rendered
  expect(await pageCursor.textContent()).toBe('2');
  expect(await pageCount.textContent()).toBe('3');

  // Chagnes origin title
  {
    const inlineLink = page.locator('affine-reference').nth(1);
    const inlineTitle = inlineLink.locator('.affine-reference-title');
    await expect(inlineTitle).toHaveText('PDF page');

    await title.click();
    await page.keyboard.type(' preview');

    await expect(inlineTitle).toHaveText('PDF page preview');
  }

  // PDF embed view should not be re-rendered
  expect(await pageCursor.textContent()).toBe('2');
  expect(await pageCount.textContent()).toBe('3');
});

test('should sync name in pdf embed view', async ({ page }) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await enablePDFEmbedView(page);
  await clickNewPageButton(page);
  const title = getBlockSuiteEditorTitle(page);
  await title.click();
  await page.keyboard.press('Enter');

  await insertAttachment(page, fixturesDir.join('lorem-ipsum.pdf').value);

  const attachment = page.locator('affine-attachment');
  await attachment.hover();

  const attachmentToolbar = page.locator('.affine-attachment-toolbar');
  await expect(attachmentToolbar).toBeVisible();

  const attachmentTitle = attachment.locator(
    '.affine-attachment-content-title-text'
  );
  await expect(attachmentTitle).toHaveText('lorem-ipsum.pdf');

  // Renames
  await attachmentToolbar.getByRole('button', { name: 'Rename' }).click();
  const input = page
    .locator('.affine-attachment-rename-input-wrapper')
    .locator('input');
  await input.fill('What is Lorem Ipsum');
  await page.keyboard.press('Enter');
  await expect(attachmentTitle).toHaveText('What is Lorem Ipsum.pdf');

  await attachment.hover();

  // Switches to embed view
  await attachmentToolbar.getByRole('button', { name: 'Switch view' }).click();
  await attachmentToolbar.getByRole('button', { name: 'Embed view' }).click();

  await page.waitForTimeout(500);

  const portal = attachment.locator('lit-react-portal');
  const portalName = portal.locator('.pdf-name');
  await expect(portal).toBeVisible();

  await page.waitForTimeout(500);
  await expect(portalName).toHaveText('What is Lorem Ipsum.pdf');

  await attachment.hover();

  // Renames
  await attachmentToolbar.getByRole('button', { name: 'Rename' }).click();
  await input.fill('lorem-ipsum');
  await page.keyboard.press('Enter');
  await expect(portalName).toHaveText('lorem-ipsum.pdf');
});
