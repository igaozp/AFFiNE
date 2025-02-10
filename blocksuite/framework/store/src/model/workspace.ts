import type { Slot } from '@blocksuite/global/utils';
import type { BlobEngine } from '@blocksuite/sync';
import type { Awareness } from 'y-protocols/awareness.js';
import type * as Y from 'yjs';

import type { Schema } from '../schema/schema.js';
import type { IdGenerator } from '../utils/id-generator.js';
import type { AwarenessStore } from '../yjs/awareness.js';
import type { CreateBlocksOptions, Doc, GetBlocksOptions } from './doc.js';
import type { Store } from './store/store.js';
import type { WorkspaceMeta } from './workspace-meta.js';

export interface Workspace {
  readonly id: string;
  readonly meta: WorkspaceMeta;
  readonly idGenerator: IdGenerator;
  readonly blobSync: BlobEngine;
  readonly awarenessStore: AwarenessStore;
  readonly onLoadDoc?: (doc: Y.Doc) => void;
  readonly onLoadAwareness?: (awareness: Awareness) => void;

  get schema(): Schema;
  get doc(): Y.Doc;
  get docs(): Map<string, Doc>;

  slots: {
    docListUpdated: Slot;
    docCreated: Slot<string>;
    docRemoved: Slot<string>;
  };

  createDoc(options?: CreateBlocksOptions): Store;
  getDoc(docId: string, options?: GetBlocksOptions): Store | null;
  removeDoc(docId: string): void;

  dispose(): void;
}
