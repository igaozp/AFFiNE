import type { Slot } from '@blocksuite/global/utils';

import type { DraftModel, Store } from '../model/index.js';
import type { AssetsManager } from './assets.js';
import type { Slice } from './slice.js';
import type {
  BlockSnapshot,
  CollectionInfoSnapshot,
  DocCRUD,
  DocSnapshot,
  SliceSnapshot,
} from './type.js';

export type BeforeImportPayload =
  | {
      snapshot: BlockSnapshot;
      type: 'block';
      parent?: string;
      index?: number;
    }
  | {
      snapshot: SliceSnapshot;
      type: 'slice';
    }
  | {
      snapshot: DocSnapshot;
      type: 'page';
    }
  | {
      snapshot: CollectionInfoSnapshot;
      type: 'info';
    };

export type BeforeExportPayload =
  | {
      model: DraftModel;
      type: 'block';
    }
  | {
      page: Store;
      type: 'page';
    }
  | {
      slice: Slice;
      type: 'slice';
    }
  | {
      type: 'info';
    };

export type FinalPayload =
  | {
      snapshot: BlockSnapshot;
      type: 'block';
      model: DraftModel;
      parent?: string;
      index?: number;
    }
  | {
      snapshot: DocSnapshot;
      type: 'page';
      page: Store;
    }
  | {
      snapshot: SliceSnapshot;
      type: 'slice';
      slice: Slice;
    }
  | {
      snapshot: CollectionInfoSnapshot;
      type: 'info';
    };

export type TransformerSlots = {
  beforeImport: Slot<BeforeImportPayload>;
  afterImport: Slot<FinalPayload>;
  beforeExport: Slot<BeforeExportPayload>;
  afterExport: Slot<FinalPayload>;
};

type TransformerMiddlewareOptions = {
  assetsManager: AssetsManager;
  slots: TransformerSlots;
  docCRUD: DocCRUD;
  adapterConfigs: Map<string, string>;
};

export type TransformerMiddleware = (
  options: TransformerMiddlewareOptions
) => void;
