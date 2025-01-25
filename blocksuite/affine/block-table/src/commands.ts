import '@blocksuite/affine-shared/commands';

import { TableModelFlavour } from '@blocksuite/affine-model';
import { generateFractionalIndexingKeyBetween } from '@blocksuite/affine-shared/utils';
import type { BlockCommands, Command } from '@blocksuite/block-std';
import { nanoid, Text } from '@blocksuite/store';
export const insertTableBlockCommand: Command<
  'selectedModels',
  'insertedTableBlockId',
  {
    place?: 'after' | 'before';
    removeEmptyLine?: boolean;
  }
> = (ctx, next) => {
  const { selectedModels, place, removeEmptyLine, std } = ctx;
  if (!selectedModels?.length) return;

  const targetModel =
    place === 'before'
      ? selectedModels[0]
      : selectedModels[selectedModels.length - 1];

  if (!targetModel) return;

  const row1Id = nanoid();
  const row2Id = nanoid();
  const col1Id = nanoid();
  const col2Id = nanoid();
  const order1 = generateFractionalIndexingKeyBetween(null, null);
  const order2 = generateFractionalIndexingKeyBetween(order1, null);

  const initialTableData = {
    rows: {
      [row1Id]: { rowId: row1Id, order: order1 },
      [row2Id]: { rowId: row2Id, order: order2 },
    },
    columns: {
      [col1Id]: { columnId: col1Id, order: order1 },
      [col2Id]: { columnId: col2Id, order: order2 },
    },
    cells: {
      [`${row1Id}:${col1Id}`]: { text: new Text() },
      [`${row1Id}:${col2Id}`]: { text: new Text() },
      [`${row2Id}:${col1Id}`]: { text: new Text() },
      [`${row2Id}:${col2Id}`]: { text: new Text() },
    },
  };

  const result = std.store.addSiblingBlocks(
    targetModel,
    [{ flavour: TableModelFlavour, ...initialTableData }],
    place
  );
  const blockId = result[0];

  if (blockId == null) return;

  if (removeEmptyLine && targetModel.text?.length === 0) {
    std.store.deleteBlock(targetModel);
  }

  next({ insertedTableBlockId: blockId });
};

export const tableCommands: BlockCommands = {
  insertTableBlock: insertTableBlockCommand,
};
