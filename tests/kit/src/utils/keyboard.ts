import type { Page } from '@playwright/test';

const IS_MAC = process.platform === 'darwin';

async function keyDownCtrlOrMeta(page: Page) {
  if (IS_MAC) {
    await page.keyboard.down('Meta');
  } else {
    await page.keyboard.down('Control');
  }
}

async function keyUpCtrlOrMeta(page: Page) {
  if (IS_MAC) {
    await page.keyboard.up('Meta');
  } else {
    await page.keyboard.up('Control');
  }
}

// It's not good enough, but better than calling keyDownCtrlOrMeta and keyUpCtrlOrMeta separately
export const withCtrlOrMeta = async (page: Page, fn: () => Promise<void>) => {
  await keyDownCtrlOrMeta(page);
  await fn();
  await keyUpCtrlOrMeta(page);
};

export async function pressEnter(page: Page, count = 1) {
  // avoid flaky test by simulate real user input
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Enter', { delay: 50 });
  }
}

export async function pressTab(page: Page) {
  await page.keyboard.press('Tab', { delay: 50 });
}

export async function pressShiftTab(page: Page) {
  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab', { delay: 50 });
  await page.keyboard.up('Shift');
}

export async function pressShiftEnter(page: Page) {
  await page.keyboard.down('Shift');
  await page.keyboard.press('Enter', { delay: 50 });
  await page.keyboard.up('Shift');
}

export async function pressBackspace(page: Page, count = 1) {
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Backspace', { delay: 50 });
  }
}

export async function pressEscape(page: Page, count = 1) {
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Escape', { delay: 50 });
  }
}

export async function copyByKeyboard(page: Page) {
  await keyDownCtrlOrMeta(page);
  await page.keyboard.press('c', { delay: 50 });
  await keyUpCtrlOrMeta(page);
}

export async function cutByKeyboard(page: Page) {
  await keyDownCtrlOrMeta(page);
  await page.keyboard.press('x', { delay: 50 });
  await keyUpCtrlOrMeta(page);
}

export async function pasteByKeyboard(page: Page) {
  await keyDownCtrlOrMeta(page);
  await page.keyboard.press('v', { delay: 50 });
  await keyUpCtrlOrMeta(page);
}

export async function selectAllByKeyboard(page: Page) {
  await keyDownCtrlOrMeta(page);
  await page.keyboard.press('a', { delay: 50 });
  await keyUpCtrlOrMeta(page);
}

export async function undoByKeyboard(page: Page) {
  await keyDownCtrlOrMeta(page);
  await page.keyboard.press('z', { delay: 50 });
  await keyUpCtrlOrMeta(page);
}

export async function writeTextToClipboard(page: Page, text: string) {
  // paste the url
  await page.evaluate(
    async ([text]) => {
      const clipData = {
        'text/plain': text,
      };
      const e = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer(),
      });
      Object.defineProperty(e, 'target', {
        writable: false,
        value: document,
      });
      Object.entries(clipData).forEach(([key, value]) => {
        e.clipboardData?.setData(key, value);
      });
      document.dispatchEvent(e);
    },
    [text]
  );
}
