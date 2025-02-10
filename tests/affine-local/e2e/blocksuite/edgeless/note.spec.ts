import { test } from '@affine-test/kit/playwright';
import {
  clickEdgelessModeButton,
  clickView,
  createEdgelessNoteBlock,
  getEdgelessSelectedIds,
  getPageMode,
  locateEditorContainer,
  locateElementToolbar,
  locateModeSwitchButton,
} from '@affine-test/kit/utils/editor';
import {
  pasteByKeyboard,
  pressBackspace,
  pressEnter,
  selectAllByKeyboard,
  undoByKeyboard,
} from '@affine-test/kit/utils/keyboard';
import { openHomePage } from '@affine-test/kit/utils/load-page';
import {
  clickNewPageButton,
  type,
  waitForEditorLoad,
} from '@affine-test/kit/utils/page-logic';
import { expect, type Page } from '@playwright/test';

const title = 'Edgeless Note Header Test';

test.beforeEach(async ({ page }) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await clickNewPageButton(page, title);
  await page.keyboard.press('Enter');
  await page.keyboard.type('Hello');
  await page.keyboard.press('Enter');
  await page.keyboard.type('World');
  await clickEdgelessModeButton(page);
  const container = locateEditorContainer(page);
  await container.click();
});

// the first note block is called page block
test.describe('edgeless page block', () => {
  const locateHeaderToolbar = (page: Page) =>
    page.getByTestId('edgeless-page-block-header');

  test('only first note block has header toolbar and its element toolbar', async ({
    page,
  }) => {
    const toolbar = locateHeaderToolbar(page);
    await expect(toolbar).toHaveCount(1);
    await expect(toolbar).toBeVisible();

    await createEdgelessNoteBlock(page, [100, 100]);

    await expect(toolbar).toHaveCount(1);
    await expect(toolbar).toBeVisible();
  });

  test('should shrink note block when clicking on the toggle button', async ({
    page,
  }) => {
    const toolbar = locateHeaderToolbar(page);
    const toolBox = await toolbar.boundingBox();
    const noteBox = await page.locator('affine-edgeless-note').boundingBox();
    if (!noteBox || !toolBox) throw new Error('Bounding box not found');
    expect(noteBox.height).toBeGreaterThan(toolBox.height);

    const toggleButton = toolbar.getByTestId('edgeless-note-toggle-button');
    await toggleButton.click();

    const newNoteBox = await page.locator('affine-edgeless-note').boundingBox();
    if (!newNoteBox) throw new Error('Bounding box not found');
    expect(newNoteBox.height).toBe(toolBox.height);

    await toggleButton.click();
    const newNoteBox2 = await page
      .locator('affine-edgeless-note')
      .boundingBox();
    if (!newNoteBox2) throw new Error('Bounding box not found');
    expect(newNoteBox2).toEqual(noteBox);
  });

  test('page title in toolbar should be displayed when page block is collapsed and hidden when page block is not collapsed', async ({
    page,
  }) => {
    const toolbar = locateHeaderToolbar(page);
    const toolbarTitle = toolbar.getByTestId('edgeless-note-title');
    await expect(toolbarTitle).toHaveText('');

    const toggleButton = toolbar.getByTestId('edgeless-note-toggle-button');
    await toggleButton.click();
    await expect(toolbarTitle).toHaveText(title);

    await toggleButton.click();
    await expect(toolbarTitle).toHaveText('');
  });

  test('should switch to page mode when expand button is clicked', async ({
    page,
  }) => {
    const toolbar = locateHeaderToolbar(page);
    const expandButton = toolbar.getByTestId('edgeless-note-expand-button');
    await expandButton.click();

    expect(await getPageMode(page)).toBe('page');
  });

  test('should open doc properties dialog when info button is clicked', async ({
    page,
  }) => {
    const toolbar = locateHeaderToolbar(page);
    const infoButton = toolbar.getByTestId('edgeless-note-info-button');
    await infoButton.click();
    const infoModal = page.getByTestId('info-modal');
    await expect(infoModal).toBeVisible();
  });

  test('should copy note edgeless link to clipboard when link button is clicked', async ({
    page,
  }) => {
    const toolbar = locateHeaderToolbar(page);
    await selectAllByKeyboard(page);
    const noteId = (await getEdgelessSelectedIds(page))[0];

    const linkButton = toolbar.getByTestId('edgeless-note-link-button');
    await linkButton.click();

    const url = page.url();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toBe(`${url}&blockIds=${noteId}`);
  });

  test('info button should hidden in peek view', async ({ page }) => {
    const url = page.url();
    await page.evaluate(url => navigator.clipboard.writeText(url), url);

    await clickNewPageButton(page);
    await page.keyboard.press('Enter');
    await pasteByKeyboard(page);
    const reference = page.locator('affine-reference');
    await reference.click({ modifiers: ['Shift'] });

    const toolbar = locateHeaderToolbar(page);
    const infoButton = toolbar.getByTestId('edgeless-note-info-button');

    await expect(toolbar).toBeVisible();
    await expect(infoButton).toBeHidden();
  });

  test('page title should show in note when page block is not collapsed', async ({
    page,
  }) => {
    const note = page.locator('affine-edgeless-note');
    const docTitle = note.locator('doc-title');
    await expect(docTitle).toBeVisible();
    await expect(docTitle).toHaveText(title);

    await note.dblclick();
    await docTitle.click();

    // clear the title
    await selectAllByKeyboard(page);
    await pressBackspace(page);
    await expect(docTitle).toHaveText('');

    // type new title
    await type(page, 'New Title');
    await expect(docTitle).toHaveText('New Title');

    // cursor could move between doc title and note content
    await page.keyboard.press('ArrowDown');
    await type(page, 'xx');

    const paragraphs = note.locator('affine-paragraph v-line');
    const numParagraphs = await paragraphs.count();
    await expect(paragraphs.first()).toHaveText('xxHello');

    await page.keyboard.press('ArrowUp');
    await type(page, 'yy');
    await expect(docTitle).toHaveText('yyNew Title');

    await pressEnter(page);
    await expect(docTitle).toHaveText('yy');
    await expect(paragraphs).toHaveCount(numParagraphs + 1);
    await expect(paragraphs.nth(0)).toHaveText('New Title');
    await expect(paragraphs.nth(1)).toHaveText('xxHello');
  });
});

test.describe('edgeless note element toolbar', () => {
  test('the toolbar of page block should not contains auto-height button and display in page button', async ({
    page,
  }) => {
    await selectAllByKeyboard(page);
    const toolbar = locateElementToolbar(page);
    const autoHeight = toolbar.getByTestId('edgeless-note-auto-height');
    const displayInPage = toolbar.getByTestId('display-in-page');

    await expect(toolbar).toBeVisible();
    await expect(autoHeight).toHaveCount(0);
    await expect(displayInPage).toHaveCount(0);
  });

  test('the toolbar of note block should contains auto-height button and display in page button', async ({
    page,
  }) => {
    await createEdgelessNoteBlock(page, [100, 100]);
    await page.waitForSelector('.affine-paragraph-placeholder.visible');
    await clickView(page, [0, 0]);
    await clickView(page, [100, 100]);

    const toolbar = locateElementToolbar(page);
    const autoHeight = toolbar.getByTestId('edgeless-note-auto-height');
    const displayInPage = toolbar.getByTestId('display-in-page');

    await expect(toolbar).toBeVisible();
    await expect(autoHeight).toBeVisible();
    await expect(displayInPage).toBeVisible();
  });

  test('display in page button', async ({ page }) => {
    const editorContainer = locateEditorContainer(page);
    const notes = editorContainer.locator('affine-note');

    await createEdgelessNoteBlock(page, [100, 100]);
    await page.waitForSelector('.affine-paragraph-placeholder.visible');
    await page.keyboard.type('Note 2');
    await clickView(page, [0, 0]);
    await clickView(page, [100, 100]);

    const toolbar = locateElementToolbar(page);
    const displayInPage = toolbar.getByTestId('display-in-page');

    await displayInPage.click();
    await locateModeSwitchButton(page, 'page').click();
    expect(notes).toHaveCount(2);

    await clickEdgelessModeButton(page);
    await clickView(page, [100, 100]);
    await displayInPage.click();
    await locateModeSwitchButton(page, 'page').click();
    await waitForEditorLoad(page);
    expect(notes).toHaveCount(1);

    const undoButton = page.getByTestId('undo-display-in-page');
    const viewTocButton = page.getByTestId('view-in-toc');

    await clickEdgelessModeButton(page);
    await waitForEditorLoad(page);
    await clickView(page, [100, 100]);
    await displayInPage.click();
    expect(undoButton).toBeVisible();
    expect(viewTocButton).toBeVisible();

    await undoButton.click();
    await expect(undoButton).toBeHidden();
    await locateModeSwitchButton(page, 'page').click();
    await waitForEditorLoad(page);
    expect(notes).toHaveCount(1);

    await clickEdgelessModeButton(page);
    await waitForEditorLoad(page);
    await clickView(page, [100, 100]);
    await displayInPage.click();
    await undoByKeyboard(page);
    await page.waitForTimeout(500);
    expect(
      undoButton,
      'the toast should be hidden immediately when undo by keyboard'
    ).toBeHidden();

    await displayInPage.click();
    await viewTocButton.click();
    const toc = page.locator('affine-outline-panel');
    await toc.waitFor({ state: 'visible' });
    const highlightNoteCards = toc.locator(
      'affine-outline-note-card > [data-status="selected"]'
    );
    expect(highlightNoteCards).toHaveCount(1);
  });
});
