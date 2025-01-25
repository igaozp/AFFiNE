import EventEmitter2 from 'eventemitter2';
import { difference } from 'lodash-es';
import { BehaviorSubject, type Observable } from 'rxjs';

import type { BlobRecord, BlobStorage } from '../../storage';
import { OverCapacityError } from '../../storage';
import { MANUALLY_STOP, throwIfAborted } from '../../utils/throw-if-aborted';
import type { PeerStorageOptions } from '../types';

export interface BlobSyncState {
  isStorageOverCapacity: boolean;
}

export interface BlobSync {
  readonly state$: Observable<BlobSyncState>;
  downloadBlob(
    blobId: string,
    signal?: AbortSignal
  ): Promise<BlobRecord | null>;
  uploadBlob(blob: BlobRecord, signal?: AbortSignal): Promise<void>;
  fullSync(signal?: AbortSignal): Promise<void>;
  setMaxBlobSize(size: number): void;
  onReachedMaxBlobSize(cb: (byteSize: number) => void): () => void;
}

export class BlobSyncImpl implements BlobSync {
  readonly state$ = new BehaviorSubject<BlobSyncState>({
    isStorageOverCapacity: false,
  });
  private abort: AbortController | null = null;
  private maxBlobSize: number = 1024 * 1024 * 100; // 100MB
  readonly event = new EventEmitter2();

  constructor(readonly storages: PeerStorageOptions<BlobStorage>) {}

  async downloadBlob(blobId: string, signal?: AbortSignal) {
    const localBlob = await this.storages.local.get(blobId, signal);
    if (localBlob) {
      return localBlob;
    }

    for (const storage of Object.values(this.storages.remotes)) {
      const data = await storage.get(blobId, signal);
      if (data) {
        await this.storages.local.set(data, signal);
        return data;
      }
    }
    return null;
  }

  async uploadBlob(blob: BlobRecord, signal?: AbortSignal) {
    if (blob.data.length > this.maxBlobSize) {
      this.event.emit('abort-large-blob', blob.data.length);
      console.error('blob over limit, abort set');
    }

    await this.storages.local.set(blob);
    await Promise.allSettled(
      Object.values(this.storages.remotes).map(async remote => {
        try {
          return await remote.set(blob, signal);
        } catch (err) {
          if (err instanceof OverCapacityError) {
            this.state$.next({ isStorageOverCapacity: true });
          }
          throw err;
        }
      })
    );
  }

  async fullSync(signal?: AbortSignal) {
    throwIfAborted(signal);

    await this.storages.local.connection.waitForConnected(signal);

    for (const [remotePeer, remote] of Object.entries(this.storages.remotes)) {
      let localList: string[] = [];
      let remoteList: string[] = [];

      await remote.connection.waitForConnected(signal);

      try {
        localList = (await this.storages.local.list(signal)).map(b => b.key);
        throwIfAborted(signal);
        remoteList = (await remote.list(signal)).map(b => b.key);
        throwIfAborted(signal);
      } catch (err) {
        if (err === MANUALLY_STOP) {
          throw err;
        }
        console.error(`error when sync`, err);
        continue;
      }

      const needUpload = difference(localList, remoteList);
      for (const key of needUpload) {
        try {
          const data = await this.storages.local.get(key, signal);
          throwIfAborted(signal);
          if (data) {
            await remote.set(data, signal);
            throwIfAborted(signal);
          }
        } catch (err) {
          if (err === MANUALLY_STOP) {
            throw err;
          }
          console.error(
            `error when sync ${key} from [local] to [${remotePeer}]`,
            err
          );
        }
      }

      const needDownload = difference(remoteList, localList);

      for (const key of needDownload) {
        try {
          const data = await remote.get(key, signal);
          throwIfAborted(signal);
          if (data) {
            await this.storages.local.set(data, signal);
            throwIfAborted(signal);
          }
        } catch (err) {
          if (err === MANUALLY_STOP) {
            throw err;
          }
          console.error(
            `error when sync ${key} from [${remotePeer}] to [local]`,
            err
          );
        }
      }
    }
  }

  start() {
    if (this.abort) {
      this.abort.abort(MANUALLY_STOP);
    }

    const abort = new AbortController();
    this.abort = abort;

    this.fullSync(abort.signal).catch(error => {
      if (error === MANUALLY_STOP) {
        return;
      }
      console.error('sync blob error', error);
    });
  }

  stop() {
    this.abort?.abort(MANUALLY_STOP);
    this.abort = null;
  }

  addPriority(_id: string, _priority: number): () => void {
    // TODO: implement
    return () => {};
  }

  setMaxBlobSize(size: number): void {
    this.maxBlobSize = size;
  }

  onReachedMaxBlobSize(cb: (byteSize: number) => void): () => void {
    this.event.on('abort-large-blob', cb);
    return () => {
      this.event.off('abort-large-blob', cb);
    };
  }
}
