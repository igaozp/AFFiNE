import { correctNumberedListsOrderToPrev } from '@blocksuite/affine-block-list';
import { matchFlavours } from '@blocksuite/affine-shared/utils';
import type { BlockStdScope } from '@blocksuite/block-std';
import type { TransformerMiddleware } from '@blocksuite/store';

export const reorderList =
  (std: BlockStdScope): TransformerMiddleware =>
  ({ slots }) => {
    slots.afterImport.on(payload => {
      if (payload.type === 'block') {
        const model = payload.model;
        if (
          matchFlavours(model, ['affine:list']) &&
          model.type === 'numbered'
        ) {
          const next = std.store.getNext(model);
          correctNumberedListsOrderToPrev(std.store, model);
          if (next) {
            correctNumberedListsOrderToPrev(std.store, next);
          }
        }
      }
    });
  };
