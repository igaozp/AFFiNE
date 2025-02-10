import type {
  BrushElementModel,
  ConnectorElementModel,
  DocMode,
  GroupElementModel,
} from '@blocksuite/affine-model';
import type { Store } from '@blocksuite/store';

export type AbstractEditor = {
  doc: Store;
  mode: DocMode;
} & HTMLElement;

export type Connectable = Exclude<
  BlockSuite.EdgelessModel,
  ConnectorElementModel | BrushElementModel | GroupElementModel
>;
