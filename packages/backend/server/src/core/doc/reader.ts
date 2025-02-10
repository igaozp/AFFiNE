import { FactoryProvider, Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';

import { Config, CryptoHelper, UserFriendlyError } from '../../base';
import { PgWorkspaceDocStorageAdapter } from './adapters/workspace';
import { type DocRecord } from './storage';

export abstract class DocReader {
  abstract getDoc(
    workspaceId: string,
    docId: string
  ): Promise<DocRecord | null>;
}

@Injectable()
export class DatabaseDocReader extends DocReader {
  constructor(protected readonly workspace: PgWorkspaceDocStorageAdapter) {
    super();
  }

  async getDoc(workspaceId: string, docId: string): Promise<DocRecord | null> {
    return await this.workspace.getDoc(workspaceId, docId);
  }
}

@Injectable()
export class RpcDocReader extends DatabaseDocReader {
  private readonly logger = new Logger(DocReader.name);

  constructor(
    private readonly config: Config,
    private readonly crypto: CryptoHelper,
    private readonly cls: ClsService,
    protected override readonly workspace: PgWorkspaceDocStorageAdapter
  ) {
    super(workspace);
  }

  override async getDoc(
    workspaceId: string,
    docId: string
  ): Promise<DocRecord | null> {
    const url = `${this.config.docService.endpoint}/rpc/workspaces/${workspaceId}/docs/${docId}`;
    try {
      const res = await fetch(url, {
        headers: {
          'x-access-token': this.crypto.sign(docId),
          'x-rpc-trace-id': this.cls.getId(),
        },
      });
      if (!res.ok) {
        if (res.status === 404) {
          return null;
        }
        const body = (await res.json()) as UserFriendlyError;
        throw UserFriendlyError.fromUserFriendlyErrorJSON(body);
      }
      const timestamp = res.headers.get('x-doc-timestamp') as string;
      const editor = res.headers.get('x-doc-editor-id') as string;
      const bin = await res.arrayBuffer();
      return {
        spaceId: workspaceId,
        docId,
        bin: Buffer.from(bin),
        timestamp: parseInt(timestamp),
        editor,
      };
    } catch (err) {
      if (err instanceof UserFriendlyError) {
        throw err;
      }
      // other error
      this.logger.error(
        `Failed to fetch doc ${url}, error: ${err}`,
        (err as Error).stack
      );
      // fallback to database doc service if the error is not user friendly, like network error
      return await super.getDoc(workspaceId, docId);
    }
  }
}

export const DocReaderProvider: FactoryProvider = {
  provide: DocReader,
  useFactory: (config: Config, ref: ModuleRef) => {
    if (config.flavor.doc) {
      return ref.create(DatabaseDocReader);
    }
    return ref.create(RpcDocReader);
  },
  inject: [Config, ModuleRef],
};
