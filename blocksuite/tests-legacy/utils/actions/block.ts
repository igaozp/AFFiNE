import type { Page } from '@playwright/test';

import { waitNextFrame } from './misc.js';

export async function updateBlockType(
  page: Page,
  flavour: BlockSuite.Flavour,
  type?: string
) {
  await page.evaluate(
    ([flavour, type]) => {
      window.host.std.command.exec(window.$blocksuite.blocks.updateBlockType, {
        flavour,
        props: {
          type,
        },
      });
    },
    [flavour, type] as [BlockSuite.Flavour, string?]
  );
  await waitNextFrame(page, 400);
}
