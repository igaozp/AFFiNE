import type { StorageConstructor } from '..';
import { IndexedDBBlobStorage } from './blob';
import { IndexedDBDocStorage } from './doc';
import { IndexedDBSyncStorage } from './sync';

export * from './blob';
export * from './doc';
export * from './sync';

export const idbStorages = [
  IndexedDBDocStorage,
  IndexedDBBlobStorage,
  IndexedDBSyncStorage,
] satisfies StorageConstructor[];
