import EventEmitter2 from 'eventemitter2';

import type { AwarenessStorage } from './awareness';
import type { BlobStorage } from './blob';
import type { DocStorage } from './doc';
import { DummyAwarenessStorage } from './dummy/awareness';
import { DummyBlobStorage } from './dummy/blob';
import { DummyDocStorage } from './dummy/doc';
import { DummySyncStorage } from './dummy/sync';
import type { StorageType } from './storage';
import type { SyncStorage } from './sync';

type Storages = DocStorage | BlobStorage | SyncStorage | AwarenessStorage;

export type SpaceStorageOptions = {
  [K in StorageType]?: Storages & { storageType: K };
};

export class SpaceStorage {
  protected readonly storages: {
    [K in StorageType]: Storages & { storageType: K };
  };
  private readonly event = new EventEmitter2();
  private readonly disposables: Set<() => void> = new Set();

  constructor(storages: SpaceStorageOptions) {
    this.storages = {
      awareness: storages.awareness ?? new DummyAwarenessStorage(),
      blob: storages.blob ?? new DummyBlobStorage(),
      doc: storages.doc ?? new DummyDocStorage(),
      sync: storages.sync ?? new DummySyncStorage(),
    };
  }

  get<T extends StorageType>(type: T): Extract<Storages, { storageType: T }> {
    const storage = this.storages[type];

    if (!storage) {
      throw new Error(`Storage ${type} not registered.`);
    }

    return storage as unknown as Extract<Storages, { storageType: T }>;
  }

  connect() {
    Object.values(this.storages).forEach(storage => {
      storage.connection.connect();
    });
  }

  disconnect() {
    Object.values(this.storages).forEach(storage => {
      storage.connection.disconnect();
    });
  }

  async waitForConnected(signal?: AbortSignal) {
    await Promise.all(
      Object.values(this.storages).map(storage =>
        storage.connection.waitForConnected(signal)
      )
    );
  }

  async destroy() {
    this.disposables.forEach(disposable => disposable());
    this.event.removeAllListeners();
  }
}

export * from './awareness';
export * from './blob';
export * from './doc';
export * from './errors';
export * from './history';
export * from './storage';
export * from './sync';
