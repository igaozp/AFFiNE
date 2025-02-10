import { EMBED_BLOCK_FLAVOUR_LIST } from '@blocksuite/affine-shared/consts';
import {
  getNextContentBlock,
  matchFlavours,
} from '@blocksuite/affine-shared/utils';
import {
  BlockSelection,
  type BlockStdScope,
  TextSelection,
} from '@blocksuite/block-std';

export function forwardDelete(std: BlockStdScope) {
  const { store, host } = std;
  const text = std.selection.find(TextSelection);
  if (!text) return;
  const isCollapsed = text.isCollapsed();
  const model = store.getBlock(text.from.blockId)?.model;
  if (!model || !matchFlavours(model, ['affine:paragraph'])) return;
  const isEnd = isCollapsed && text.from.index === model.text.length;
  if (!isEnd) return;
  const parent = store.getParent(model);
  if (!parent) return;

  const nextSibling = store.getNext(model);
  const ignoreForwardDeleteFlavourList: BlockSuite.Flavour[] = [
    'affine:attachment',
    'affine:bookmark',
    'affine:database',
    'affine:code',
    'affine:image',
    'affine:divider',
    ...EMBED_BLOCK_FLAVOUR_LIST,
  ];

  if (matchFlavours(nextSibling, ignoreForwardDeleteFlavourList)) {
    std.selection.setGroup('note', [
      std.selection.create(BlockSelection, { blockId: nextSibling.id }),
    ]);
    return true;
  }

  if (nextSibling?.text) {
    model.text.join(nextSibling.text);
    if (nextSibling.children) {
      const parent = store.getParent(nextSibling);
      if (!parent) return false;
      store.moveBlocks(nextSibling.children, parent, model, false);
    }

    store.deleteBlock(nextSibling);
    return true;
  }

  const nextBlock = getNextContentBlock(host, model);
  if (nextBlock?.text) {
    model.text.join(nextBlock.text);
    if (nextBlock.children) {
      const parent = store.getParent(nextBlock);
      if (!parent) return false;
      store.moveBlocks(
        nextBlock.children,
        parent,
        store.getParent(model),
        false
      );
    }
    store.deleteBlock(nextBlock);
    return true;
  }

  if (nextBlock) {
    std.selection.setGroup('note', [
      std.selection.create(BlockSelection, { blockId: nextBlock.id }),
    ]);
  }
  return true;
}
