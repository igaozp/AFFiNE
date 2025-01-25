import type { Connection } from '../connection';

export type StorageType = 'blob' | 'doc' | 'sync' | 'awareness';

export interface Storage {
  readonly storageType: StorageType;
  readonly connection: Connection;
}
