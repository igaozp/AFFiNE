import {
  deleteBlobMutation,
  listBlobsQuery,
  releaseDeletedBlobsMutation,
  setBlobMutation,
} from '@affine/graphql';

import { type BlobRecord, BlobStorageBase } from '../../storage';
import { HttpConnection } from './http';

interface CloudBlobStorageOptions {
  serverBaseUrl: string;
  id: string;
}

export class CloudBlobStorage extends BlobStorageBase {
  static readonly identifier = 'CloudBlobStorage';

  constructor(private readonly options: CloudBlobStorageOptions) {
    super();
  }

  readonly connection = new HttpConnection(this.options.serverBaseUrl);

  override async get(key: string) {
    const res = await this.connection.fetch(
      '/api/workspaces/' + this.options.id + '/blobs/' + key,
      {
        cache: 'default',
        headers: {
          'x-affine-version': BUILD_CONFIG.appVersion,
        },
      }
    );

    if (res.status === 404) {
      return null;
    }

    try {
      const blob = await res.blob();

      return {
        key,
        data: new Uint8Array(await blob.arrayBuffer()),
        mime: blob.type,
        size: blob.size,
        createdAt: new Date(res.headers.get('last-modified') || Date.now()),
      };
    } catch (err) {
      throw new Error('blob download error: ' + err);
    }
  }

  override async set(blob: BlobRecord) {
    await this.connection.gql({
      query: setBlobMutation,
      variables: {
        workspaceId: this.options.id,
        blob: new File([blob.data], blob.key, { type: blob.mime }),
      },
    });
  }

  override async delete(key: string, permanently: boolean) {
    await this.connection.gql({
      query: deleteBlobMutation,
      variables: { workspaceId: this.options.id, key, permanently },
    });
  }

  override async release() {
    await this.connection.gql({
      query: releaseDeletedBlobsMutation,
      variables: { workspaceId: this.options.id },
    });
  }

  override async list() {
    const res = await this.connection.gql({
      query: listBlobsQuery,
      variables: { workspaceId: this.options.id },
    });

    return res.workspace.blobs.map(blob => ({
      ...blob,
      createdAt: new Date(blob.createdAt),
    }));
  }
}
