import {
  type BlockStdScope,
  type EditorHost,
  type TextRangePoint,
  TextSelection,
} from '@blocksuite/block-std';
import type {
  BlockSnapshot,
  DraftModel,
  TransformerMiddleware,
  TransformerSlots,
} from '@blocksuite/store';

import { matchFlavours } from '../../utils';

const handlePoint = (
  point: TextRangePoint,
  snapshot: BlockSnapshot,
  model: DraftModel
) => {
  const { index, length } = point;
  if (matchFlavours(model, ['affine:page'])) {
    if (length === 0) return;
    (snapshot.props.title as Record<string, unknown>).delta =
      model.title.sliceToDelta(index, length + index);
    return;
  }

  if (!snapshot.props.text || length === 0) {
    return;
  }
  (snapshot.props.text as Record<string, unknown>).delta =
    model.text?.sliceToDelta(index, length + index);
};

const sliceText = (slots: TransformerSlots, std: EditorHost['std']) => {
  slots.afterExport.on(payload => {
    if (payload.type === 'block') {
      const snapshot = payload.snapshot;

      const model = payload.model;
      const text = std.selection.find(TextSelection);
      if (text && text.from.blockId === model.id) {
        handlePoint(text.from, snapshot, model);
        return;
      }
      if (text && text.to && text.to.blockId === model.id) {
        handlePoint(text.to, snapshot, model);
        return;
      }
    }
  });
};

export const copyMiddleware = (std: BlockStdScope): TransformerMiddleware => {
  return ({ slots }) => {
    sliceText(slots, std);
  };
};
