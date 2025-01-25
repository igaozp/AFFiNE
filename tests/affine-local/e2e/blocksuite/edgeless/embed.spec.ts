import { test } from '@affine-test/kit/playwright';
import {
  clickEdgelessModeButton,
  locateEditorContainer,
  locateElementToolbar,
} from '@affine-test/kit/utils/editor';
import { openHomePage } from '@affine-test/kit/utils/load-page';
import {
  clickNewPageButton,
  waitForEditorLoad,
} from '@affine-test/kit/utils/page-logic';
import { expect } from '@playwright/test';

const title = 'Edgeless Note Header Test';

test.beforeEach(async ({ page }) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await clickNewPageButton(page, title);
  await clickEdgelessModeButton(page);
  const container = locateEditorContainer(page);
  await container.click();
});

test('should close embed editing modal when editor switching to page mode by short cut', async ({
  page,
}) => {
  await page.keyboard.press('@');
  await page
    .getByTestId('cmdk-label')
    .getByText('Write, Draw, Plan all at Once.')
    .click();
  const toolbar = locateElementToolbar(page);
  await toolbar.getByLabel('Edit').click();

  const editingModal = page.locator('embed-card-edit-modal');
  expect(editingModal).toBeVisible();

  await page.keyboard.press('Alt+s');
  await waitForEditorLoad(page);
  expect(editingModal).toBeHidden();
});
