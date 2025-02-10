import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { metrics, OnEvent } from '../../base';
import { Models } from '../../models';
import { PgWorkspaceDocStorageAdapter } from './adapters/workspace';

@Injectable()
export class DocStorageCronJob {
  constructor(
    private readonly models: Models,
    private readonly workspace: PgWorkspaceDocStorageAdapter
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT /* everyday at 12am */)
  async cleanupExpiredHistory() {
    await this.models.doc.deleteExpiredHistories();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async reportUpdatesQueueCount() {
    metrics.doc
      .gauge('updates_queue_count')
      .record(await this.models.doc.getGlobalUpdateCount());
  }

  @OnEvent('user.deleted')
  async clearUserWorkspaces(payload: Events['user.deleted']) {
    for (const workspace of payload.ownedWorkspaces) {
      await this.workspace.deleteSpace(workspace);
    }
  }
}
