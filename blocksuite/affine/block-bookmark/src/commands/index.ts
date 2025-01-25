import type { BlockCommands } from '@blocksuite/block-std';

import { insertBookmarkCommand } from './insert-bookmark.js';
import { insertLinkByQuickSearchCommand } from './insert-link-by-quick-search.js';

export const commands: BlockCommands = {
  insertBookmark: insertBookmarkCommand,
  insertLinkByQuickSearch: insertLinkByQuickSearchCommand,
};
