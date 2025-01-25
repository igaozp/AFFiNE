import type { BlockStdScope } from '@blocksuite/block-std';
import type { TransformerMiddleware } from '@blocksuite/store';

export const newIdCrossDoc =
  (std: BlockStdScope): TransformerMiddleware =>
  ({ slots }) => {
    let samePage = false;
    slots.beforeImport.on(payload => {
      if (payload.type === 'slice') {
        samePage = payload.snapshot.pageId === std.store.id;
      }
      if (payload.type === 'block' && !samePage) {
        payload.snapshot.id = std.workspace.idGenerator();
      }
    });
  };
