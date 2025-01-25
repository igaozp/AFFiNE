import {
  BlockSuiteError,
  ErrorCode,
} from '@blocksuite/affine/global/exceptions';
import { NoopLogger, Slot } from '@blocksuite/affine/global/utils';
import {
  AwarenessStore,
  type CreateBlocksOptions,
  type Doc,
  type GetBlocksOptions,
  type IdGenerator,
  nanoid,
  type Schema,
  type Store,
  type Workspace,
  type WorkspaceMeta,
} from '@blocksuite/affine/store';
import {
  BlobEngine,
  type BlobSource,
  MemoryBlobSource,
} from '@blocksuite/affine/sync';
import { Awareness } from 'y-protocols/awareness.js';
import * as Y from 'yjs';

import { DocImpl } from './doc';
import { WorkspaceMetaImpl } from './meta';

type WorkspaceOptions = {
  id?: string;
  schema: Schema;
  blobSource?: BlobSource;
  onLoadDoc?: (doc: Y.Doc) => void;
  onLoadAwareness?: (awareness: Awareness) => void;
};

export class WorkspaceImpl implements Workspace {
  protected readonly _schema: Schema;

  readonly awarenessStore: AwarenessStore;

  readonly blobSync: BlobEngine;

  readonly blockCollections = new Map<string, Doc>();

  readonly doc: Y.Doc;

  readonly id: string;

  readonly idGenerator: IdGenerator;

  meta: WorkspaceMeta;

  slots = {
    docListUpdated: new Slot(),
    docRemoved: new Slot<string>(),
    docCreated: new Slot<string>(),
  };

  get docs() {
    return this.blockCollections;
  }

  get schema() {
    return this._schema;
  }

  readonly onLoadDoc?: (doc: Y.Doc) => void;
  readonly onLoadAwareness?: (awareness: Awareness) => void;

  constructor({
    id,
    schema,
    blobSource,
    onLoadDoc,
    onLoadAwareness,
  }: WorkspaceOptions) {
    this._schema = schema;

    this.id = id || '';
    this.doc = new Y.Doc({ guid: id });
    this.awarenessStore = new AwarenessStore(new Awareness(this.doc));
    this.onLoadDoc = onLoadDoc;
    this.onLoadAwareness = onLoadAwareness;
    this.onLoadDoc?.(this.doc);
    this.onLoadAwareness?.(this.awarenessStore.awareness);

    blobSource = blobSource ?? new MemoryBlobSource();
    const logger = new NoopLogger();

    this.blobSync = new BlobEngine(blobSource, [], logger);

    this.idGenerator = nanoid;

    this.meta = new WorkspaceMetaImpl(this.doc);
    this._bindDocMetaEvents();
  }

  private _bindDocMetaEvents() {
    this.meta.docMetaAdded.on(docId => {
      const doc = new DocImpl({
        id: docId,
        collection: this,
        doc: this.doc,
        awarenessStore: this.awarenessStore,
      });
      this.blockCollections.set(doc.id, doc);
    });

    this.meta.docMetaUpdated.on(() => this.slots.docListUpdated.emit());

    this.meta.docMetaRemoved.on(id => {
      const doc = this._getDoc(id);
      if (!doc) return;
      this.blockCollections.delete(id);
      doc.remove();
      this.slots.docRemoved.emit(id);
    });
  }

  private _hasDoc(docId: string) {
    return this.docs.has(docId);
  }

  /**
   * By default, only an empty doc will be created.
   * If the `init` parameter is passed, a `surface`, `note`, and `paragraph` block
   * will be created in the doc simultaneously.
   */
  createDoc(options: CreateBlocksOptions = {}) {
    const { id: docId = this.idGenerator(), query, readonly } = options;
    if (this._hasDoc(docId)) {
      throw new BlockSuiteError(
        ErrorCode.DocCollectionError,
        'doc already exists'
      );
    }

    this.meta.addDocMeta({
      id: docId,
      title: '',
      createDate: Date.now(),
      tags: [],
    });
    this.slots.docCreated.emit(docId);
    return this.getDoc(docId, { query, readonly }) as Store;
  }

  dispose() {
    this.awarenessStore.destroy();
  }

  private _getDoc(docId: string): Doc | null {
    const space = this.docs.get(docId) as Doc | undefined;
    return space ?? null;
  }

  getDoc(docId: string, options?: GetBlocksOptions): Store | null {
    const collection = this._getDoc(docId);
    return collection?.getStore(options) ?? null;
  }

  removeDoc(docId: string) {
    const docMeta = this.meta.getDocMeta(docId);
    if (!docMeta) {
      throw new BlockSuiteError(
        ErrorCode.DocCollectionError,
        `doc meta not found: ${docId}`
      );
    }

    const blockCollection = this._getDoc(docId);
    if (!blockCollection) return;

    blockCollection.dispose();
    this.meta.removeDocMeta(docId);
    this.blockCollections.delete(docId);
  }
}
