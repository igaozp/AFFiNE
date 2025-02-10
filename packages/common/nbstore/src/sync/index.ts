import { map, type Observable } from 'rxjs';

import type { SpaceStorage } from '../storage';
import { AwarenessSyncImpl } from './awareness';
import { BlobSyncImpl } from './blob';
import { DocSyncImpl, type DocSyncState } from './doc';
import type { PeerStorageOptions } from './types';

export type { BlobSyncState } from './blob';
export type { DocSyncDocState, DocSyncState } from './doc';

export interface SyncState {
  doc?: DocSyncState;
}

export class Sync {
  readonly doc: DocSyncImpl;
  readonly blob: BlobSyncImpl;
  readonly awareness: AwarenessSyncImpl;

  readonly state$: Observable<SyncState>;

  constructor(readonly storages: PeerStorageOptions<SpaceStorage>) {
    const doc = storages.local.get('doc');
    const blob = storages.local.get('blob');
    const sync = storages.local.get('sync');
    const awareness = storages.local.get('awareness');

    this.doc = new DocSyncImpl(
      {
        local: doc,
        remotes: Object.fromEntries(
          Object.entries(storages.remotes).map(([peerId, remote]) => [
            peerId,
            remote.get('doc'),
          ])
        ),
      },
      sync
    );
    this.blob = new BlobSyncImpl({
      local: blob,
      remotes: Object.fromEntries(
        Object.entries(storages.remotes).map(([peerId, remote]) => [
          peerId,
          remote.get('blob'),
        ])
      ),
    });
    this.awareness = new AwarenessSyncImpl({
      local: awareness,
      remotes: Object.fromEntries(
        Object.entries(storages.remotes).map(([peerId, remote]) => [
          peerId,
          remote.get('awareness'),
        ])
      ),
    });

    this.state$ = this.doc.state$.pipe(map(doc => ({ doc })));
  }

  start() {
    this.doc?.start();
    this.blob?.start();
  }

  stop() {
    this.doc?.stop();
    this.blob?.stop();
  }
}
