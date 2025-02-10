import type { Slot } from '@blocksuite/global/utils';
import type * as Y from 'yjs';

import type { Schema } from '../schema/schema.js';
import type { AwarenessStore } from '../yjs/awareness.js';
import type { YBlock } from './block/types.js';
import type { Query } from './store/query.js';
import type { Store, StoreOptions } from './store/store.js';
import type { Workspace } from './workspace.js';
import type { DocMeta } from './workspace-meta.js';

export type GetBlocksOptions = Omit<StoreOptions, 'schema' | 'doc'>;
export type CreateBlocksOptions = GetBlocksOptions & {
  id?: string;
};
export type YBlocks = Y.Map<YBlock>;

export interface Doc {
  readonly id: string;
  get meta(): DocMeta | undefined;
  get schema(): Schema;

  remove(): void;
  load(initFn?: () => void): void;
  get ready(): boolean;
  dispose(): void;

  slots: {
    historyUpdated: Slot;
    yBlockUpdated: Slot<
      | {
          type: 'add';
          id: string;
        }
      | {
          type: 'delete';
          id: string;
        }
    >;
  };

  get history(): Y.UndoManager;
  get canRedo(): boolean;
  get canUndo(): boolean;
  undo(): void;
  redo(): void;
  resetHistory(): void;
  transact(fn: () => void, shouldTransact?: boolean): void;
  withoutTransact(fn: () => void): void;

  captureSync(): void;
  clear(): void;
  getStore(options?: GetBlocksOptions): Store;
  clearQuery(query: Query, readonly?: boolean): void;

  get loaded(): boolean;
  get awarenessStore(): AwarenessStore;

  get workspace(): Workspace;

  get rootDoc(): Y.Doc;
  get spaceDoc(): Y.Doc;
  get yBlocks(): Y.Map<YBlock>;
}
