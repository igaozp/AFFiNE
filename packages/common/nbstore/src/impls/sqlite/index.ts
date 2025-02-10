import type { StorageConstructor } from '..';
import { SqliteBlobStorage } from './blob';
import { SqliteDocStorage } from './doc';
import { SqliteSyncStorage } from './sync';

export * from './blob';
export { bindNativeDBApis, type NativeDBApis } from './db';
export * from './doc';
export * from './sync';

export const sqliteStorages = [
  SqliteDocStorage,
  SqliteBlobStorage,
  SqliteSyncStorage,
] satisfies StorageConstructor[];
