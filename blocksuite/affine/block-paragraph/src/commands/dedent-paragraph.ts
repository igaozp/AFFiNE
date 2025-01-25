import type { IndentContext } from '@blocksuite/affine-shared/types';
import {
  calculateCollapsedSiblings,
  matchFlavours,
} from '@blocksuite/affine-shared/utils';
import { type Command, TextSelection } from '@blocksuite/block-std';

export const canDedentParagraphCommand: Command<
  never,
  'indentContext',
  Partial<Omit<IndentContext, 'flavour' | 'type'>>
> = (ctx, next) => {
  let { blockId, inlineIndex } = ctx;
  const { std } = ctx;
  const { selection, store } = std;
  const text = selection.find(TextSelection);

  if (!blockId) {
    /**
     * Do nothing if the selection:
     * - is not a text selection
     * - or spans multiple blocks
     */
    if (!text || (text.to && text.from.blockId !== text.to.blockId)) {
      return;
    }

    blockId = text.from.blockId;
    inlineIndex = text.from.index;
  }
  if (blockId == null || inlineIndex == null) {
    return;
  }

  const model = store.getBlock(blockId)?.model;
  if (!model || !matchFlavours(model, ['affine:paragraph'])) {
    return;
  }

  const parent = store.getParent(model);
  if (store.readonly || !parent || parent.role !== 'content') {
    // Top most, can not unindent, do nothing
    return;
  }

  const grandParent = store.getParent(parent);
  if (!grandParent) return;

  return next({
    indentContext: {
      blockId,
      inlineIndex,
      type: 'dedent',
      flavour: 'affine:paragraph',
    },
  });
};

export const dedentParagraphCommand: Command<'indentContext'> = (ctx, next) => {
  const { indentContext: dedentContext, std } = ctx;
  const { store, selection, range, host } = std;

  if (
    !dedentContext ||
    dedentContext.type !== 'dedent' ||
    dedentContext.flavour !== 'affine:paragraph'
  ) {
    console.warn(
      'you need to use `canDedentParagraph` command before running `dedentParagraph` command'
    );
    return;
  }

  const { blockId } = dedentContext;

  const model = store.getBlock(blockId)?.model;
  if (!model) return;

  const parent = store.getParent(model);
  if (!parent) return;

  const grandParent = store.getParent(parent);
  if (!grandParent) return;

  store.captureSync();

  if (
    matchFlavours(model, ['affine:paragraph']) &&
    model.type.startsWith('h') &&
    model.collapsed
  ) {
    const collapsedSiblings = calculateCollapsedSiblings(model);
    store.moveBlocks([model, ...collapsedSiblings], grandParent, parent, false);
  } else {
    const nextSiblings = store.getNexts(model);
    store.moveBlocks(nextSiblings, model);
    store.moveBlocks([model], grandParent, parent, false);
  }

  const textSelection = selection.find(TextSelection);
  if (textSelection) {
    host.updateComplete
      .then(() => {
        range.syncTextSelectionToRange(textSelection);
      })
      .catch(console.error);
  }

  return next();
};
