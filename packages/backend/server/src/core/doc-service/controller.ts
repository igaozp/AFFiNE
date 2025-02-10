import { Controller, Get, Logger, Param, Res } from '@nestjs/common';
import type { Response } from 'express';

import { NotFound, SkipThrottle } from '../../base';
import { Internal } from '../auth';
import { PgWorkspaceDocStorageAdapter } from '../doc';

@Controller('/rpc')
export class DocRpcController {
  private readonly logger = new Logger(DocRpcController.name);

  constructor(private readonly workspace: PgWorkspaceDocStorageAdapter) {}

  @SkipThrottle()
  @Internal()
  @Get('/workspaces/:workspaceId/docs/:docId')
  async getDoc(
    @Param('workspaceId') workspaceId: string,
    @Param('docId') docId: string,
    @Res() res: Response
  ) {
    const doc = await this.workspace.getDoc(workspaceId, docId);
    if (!doc) {
      throw new NotFound('Doc not found');
    }
    this.logger.log(`get doc ${docId} from workspace ${workspaceId}`);
    res.setHeader('x-doc-timestamp', doc.timestamp.toString());
    if (doc.editor) {
      res.setHeader('x-doc-editor-id', doc.editor);
    }
    res.send(doc.bin);
  }
}
