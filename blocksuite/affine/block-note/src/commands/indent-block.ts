import type { ListBlockModel } from '@blocksuite/affine-model';
import {
  calculateCollapsedSiblings,
  matchFlavours,
} from '@blocksuite/affine-shared/utils';
import type { Command } from '@blocksuite/block-std';

/**
 * @example
 * before indent:
 * - aaa
 *   - bbb
 * - ccc|
 *   - ddd
 *   - eee
 *
 * after indent:
 * - aaa
 *   - bbb
 *   - ccc|
 *     - ddd
 *     - eee
 */
export const indentBlock: Command<
  never,
  never,
  {
    blockId?: string;
    stopCapture?: boolean;
  }
> = (ctx, next) => {
  let { blockId } = ctx;
  const { std, stopCapture = true } = ctx;
  const { store } = std;
  const { schema } = store;
  if (!blockId) {
    const sel = std.selection.getGroup('note').at(0);
    blockId = sel?.blockId;
  }
  if (!blockId) return;
  const model = std.store.getBlock(blockId)?.model;
  if (!model) return;

  const previousSibling = store.getPrev(model);
  if (
    store.readonly ||
    !previousSibling ||
    !schema.isValid(model.flavour, previousSibling.flavour)
  ) {
    // can not indent, do nothing
    return;
  }

  if (stopCapture) store.captureSync();

  if (
    matchFlavours(model, ['affine:paragraph']) &&
    model.type.startsWith('h') &&
    model.collapsed
  ) {
    const collapsedSiblings = calculateCollapsedSiblings(model);
    store.moveBlocks([model, ...collapsedSiblings], previousSibling);
  } else {
    store.moveBlocks([model], previousSibling);
  }

  // update collapsed state of affine list
  if (
    matchFlavours(previousSibling, ['affine:list']) &&
    previousSibling.collapsed
  ) {
    store.updateBlock(previousSibling, {
      collapsed: false,
    } as Partial<ListBlockModel>);
  }

  return next();
};
