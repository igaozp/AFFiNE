import type { NoteBlockModel } from '@blocksuite/affine-model';
import type { BlockModel } from '@blocksuite/store';

import type { Connectable } from '../managers/connector-manager';

export function isConnectable(
  element: BlockSuite.EdgelessModel | null
): element is Connectable {
  return !!element && element.connectable;
}

export function isNoteBlock(
  element: BlockModel | BlockSuite.EdgelessModel | null
): element is NoteBlockModel {
  return !!element && 'flavour' in element && element.flavour === 'affine:note';
}
