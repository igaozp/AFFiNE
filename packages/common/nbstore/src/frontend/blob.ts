import type { BlobRecord, BlobStorage } from '../storage';
import type { BlobSync } from '../sync/blob';

export class BlobFrontend {
  constructor(
    public readonly storage: BlobStorage,
    private readonly sync: BlobSync
  ) {}

  get(blobId: string) {
    return this.sync.downloadBlob(blobId);
  }

  set(blob: BlobRecord) {
    return this.sync.uploadBlob(blob);
  }

  fullSync() {
    return this.sync.fullSync();
  }

  addPriority(_id: string, _priority: number) {
    // not support yet
  }

  readonly state$ = this.sync.state$;

  setMaxBlobSize(max: number) {
    this.sync.setMaxBlobSize(max);
  }

  onReachedMaxBlobSize(cb: (byteSize: number) => void): () => void {
    return this.sync.onReachedMaxBlobSize(cb);
  }
}
