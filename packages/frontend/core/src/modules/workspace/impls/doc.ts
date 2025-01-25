import { SpecProvider } from '@blocksuite/affine/blocks';
import { Slot } from '@blocksuite/affine/global/utils';
import {
  type AwarenessStore,
  type Doc,
  type GetBlocksOptions,
  type Query,
  Store,
  type Workspace,
  type YBlock,
} from '@blocksuite/affine/store';
import { signal } from '@preact/signals-core';
import * as Y from 'yjs';

type DocOptions = {
  id: string;
  collection: Workspace;
  doc: Y.Doc;
  awarenessStore: AwarenessStore;
};

export class DocImpl implements Doc {
  private readonly _canRedo = signal(false);

  private readonly _canUndo = signal(false);

  private readonly _collection: Workspace;

  private readonly _docMap = {
    undefined: new Map<string, Store>(),
    true: new Map<string, Store>(),
    false: new Map<string, Store>(),
  };

  // doc/space container.
  private readonly _handleYEvents = (events: Y.YEvent<YBlock | Y.Text>[]) => {
    events.forEach(event => this._handleYEvent(event));
  };

  private _history!: Y.UndoManager;

  private readonly _historyObserver = () => {
    this._updateCanUndoRedoSignals();
    this.slots.historyUpdated.emit();
  };

  private readonly _initSubDoc = () => {
    {
      // This is a piece of old version compatible code. The old version relies on the subdoc instance on `spaces`.
      // So if there is no subdoc on spaces, we will create it.
      // new version no longer needs subdoc on `spaces`.
      let subDoc = this.rootDoc.getMap('spaces').get(this.id);
      if (!subDoc) {
        subDoc = new Y.Doc({
          guid: this.id,
        });
        this.rootDoc.getMap('spaces').set(this.id, subDoc);
      }
    }

    const spaceDoc = new Y.Doc({
      guid: this.id,
    });
    spaceDoc.clientID = this.rootDoc.clientID;
    this._loaded = false;

    return spaceDoc;
  };

  private _loaded!: boolean;

  private readonly _onLoadSlot = new Slot();

  /** Indicate whether the block tree is ready */
  private _ready = false;

  private _shouldTransact = true;

  private readonly _updateCanUndoRedoSignals = () => {
    const canRedo = this._history.canRedo();
    const canUndo = this._history.canUndo();
    if (this._canRedo.peek() !== canRedo) {
      this._canRedo.value = canRedo;
    }
    if (this._canUndo.peek() !== canUndo) {
      this._canUndo.value = canUndo;
    }
  };

  protected readonly _yBlocks: Y.Map<YBlock>;

  /**
   * @internal Used for convenient access to the underlying Yjs map,
   * can be used interchangeably with ySpace
   */
  protected readonly _ySpaceDoc: Y.Doc;

  readonly awarenessStore: AwarenessStore;

  readonly id: string;

  readonly rootDoc: Y.Doc;

  readonly slots = {
    historyUpdated: new Slot(),
    yBlockUpdated: new Slot<
      | {
          type: 'add';
          id: string;
        }
      | {
          type: 'delete';
          id: string;
        }
    >(),
  };

  get blobSync() {
    return this.workspace.blobSync;
  }

  get canRedo() {
    return this._canRedo.peek();
  }

  get canUndo() {
    return this._canUndo.peek();
  }

  get workspace() {
    return this._collection;
  }

  get history() {
    return this._history;
  }

  get isEmpty() {
    return this._yBlocks.size === 0;
  }

  get loaded() {
    return this._loaded;
  }

  get meta() {
    return this.workspace.meta.getDocMeta(this.id);
  }

  get ready() {
    return this._ready;
  }

  get schema() {
    return this.workspace.schema;
  }

  get spaceDoc() {
    return this._ySpaceDoc;
  }

  get yBlocks() {
    return this._yBlocks;
  }

  constructor({ id, collection, doc, awarenessStore }: DocOptions) {
    this.id = id;
    this.rootDoc = doc;
    this.awarenessStore = awarenessStore;

    this._ySpaceDoc = this._initSubDoc() as Y.Doc;

    this._yBlocks = this._ySpaceDoc.getMap('blocks');
    this._collection = collection;
  }

  private _getReadonlyKey(readonly?: boolean): 'true' | 'false' | 'undefined' {
    return (readonly?.toString() as 'true' | 'false') ?? 'undefined';
  }

  private _handleVersion() {
    // Initialization from empty yDoc, indicating that the document is new.
    if (!this.workspace.meta.hasVersion) {
      this.workspace.meta.writeVersion(this.workspace);
    }
  }

  private _handleYBlockAdd(id: string) {
    this.slots.yBlockUpdated.emit({ type: 'add', id });
  }

  private _handleYBlockDelete(id: string) {
    this.slots.yBlockUpdated.emit({ type: 'delete', id });
  }

  private _handleYEvent(event: Y.YEvent<YBlock | Y.Text | Y.Array<unknown>>) {
    // event on top-level block store
    if (event.target !== this._yBlocks) {
      return;
    }
    event.keys.forEach((value, id) => {
      try {
        if (value.action === 'add') {
          this._handleYBlockAdd(id);
          return;
        }
        if (value.action === 'delete') {
          this._handleYBlockDelete(id);
          return;
        }
      } catch (e) {
        console.error('An error occurred while handling Yjs event:');
        console.error(e);
      }
    });
  }

  private _initYBlocks() {
    const { _yBlocks } = this;
    _yBlocks.observeDeep(this._handleYEvents);
    this._history = new Y.UndoManager([_yBlocks], {
      trackedOrigins: new Set([this._ySpaceDoc.clientID]),
    });

    this._history.on('stack-cleared', this._historyObserver);
    this._history.on('stack-item-added', this._historyObserver);
    this._history.on('stack-item-popped', this._historyObserver);
    this._history.on('stack-item-updated', this._historyObserver);
  }

  /** Capture current operations to undo stack synchronously. */
  captureSync() {
    this._history.stopCapturing();
  }

  clear() {
    this._yBlocks.clear();
  }

  clearQuery(query: Query, readonly?: boolean) {
    const readonlyKey = this._getReadonlyKey(readonly);

    this._docMap[readonlyKey].delete(JSON.stringify(query));
  }

  private _destroy() {
    this._ySpaceDoc.destroy();
    this._onLoadSlot.dispose();
    this._loaded = false;
  }

  dispose() {
    this.slots.historyUpdated.dispose();

    if (this.ready) {
      this._yBlocks.unobserveDeep(this._handleYEvents);
      this._yBlocks.clear();
    }
  }

  getStore({ readonly, query, provider, extensions }: GetBlocksOptions = {}) {
    const readonlyKey = this._getReadonlyKey(readonly);

    const key = JSON.stringify(query);

    if (this._docMap[readonlyKey].has(key)) {
      return this._docMap[readonlyKey].get(key) as Store;
    }

    const storeExtensions = SpecProvider.getInstance().getSpec('store');
    const extensionSet = new Set(
      storeExtensions.value.concat(extensions ?? [])
    );

    const doc = new Store({
      doc: this,
      schema: this.workspace.schema,
      readonly,
      query,
      provider,
      extensions: Array.from(extensionSet),
    });

    this._docMap[readonlyKey].set(key, doc);

    return doc;
  }

  load(initFn?: () => void): this {
    if (this.ready) {
      return this;
    }

    this.spaceDoc.load();
    this.workspace.onLoadDoc?.(this.spaceDoc);

    if ((this.workspace.meta.docs?.length ?? 0) <= 1) {
      this._handleVersion();
    }

    this._initYBlocks();

    this._yBlocks.forEach((_, id) => {
      this._handleYBlockAdd(id);
    });

    initFn?.();

    this._loaded = true;
    this._ready = true;

    return this;
  }

  redo() {
    this._history.redo();
  }

  undo() {
    this._history.undo();
  }

  remove() {
    this._destroy();
    this.rootDoc.getMap('spaces').delete(this.id);
  }

  resetHistory() {
    this._history.clear();
  }

  /**
   * If `shouldTransact` is `false`, the transaction will not be push to the history stack.
   */
  transact(fn: () => void, shouldTransact: boolean = this._shouldTransact) {
    this._ySpaceDoc.transact(
      () => {
        try {
          fn();
        } catch (e) {
          console.error(
            `An error occurred while Y.doc ${this._ySpaceDoc.guid} transacting:`
          );
          console.error(e);
        }
      },
      shouldTransact ? this.rootDoc.clientID : null
    );
  }

  withoutTransact(callback: () => void) {
    this._shouldTransact = false;
    callback();
    this._shouldTransact = true;
  }
}
