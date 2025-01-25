import type { BlockCommands } from '@blocksuite/block-std';

import { insertEmbedLinkedDocCommand } from './insert-embed-linked-doc.js';

export const commands: BlockCommands = {
  insertEmbedLinkedDoc: insertEmbedLinkedDocCommand,
};

export type { InsertedLinkType } from './insert-embed-linked-doc';
