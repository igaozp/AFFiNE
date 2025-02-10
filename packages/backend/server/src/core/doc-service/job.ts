import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CLS_ID, ClsService } from 'nestjs-cls';

import { CallMetric, Config, genRequestId, metrics } from '../../base';
import { PgWorkspaceDocStorageAdapter } from '../doc';

@Injectable()
export class DocServiceCronJob implements OnModuleInit {
  private busy = false;
  private readonly logger = new Logger(DocServiceCronJob.name);

  constructor(
    private readonly config: Config,
    private readonly cls: ClsService,
    private readonly workspace: PgWorkspaceDocStorageAdapter,
    private readonly registry: SchedulerRegistry
  ) {}

  onModuleInit() {
    if (this.config.doc.manager.enableUpdateAutoMerging) {
      this.registry.addInterval(
        this.autoMergePendingDocUpdates.name,
        // scheduler registry will clean up the interval when the app is stopped
        setInterval(() => {
          if (this.busy) {
            return;
          }
          this.busy = true;
          this.autoMergePendingDocUpdates()
            .catch(() => {
              /* never fail */
            })
            .finally(() => {
              this.busy = false;
            });
        }, this.config.doc.manager.updatePollInterval)
      );

      this.logger.log('Updates pending queue auto merging cron started');
    }
  }

  @CallMetric('doc', 'auto_merge_pending_doc_updates')
  async autoMergePendingDocUpdates() {
    await this.cls.run(async () => {
      this.cls.set(CLS_ID, genRequestId('job'));
      try {
        const randomDoc = await this.workspace.randomDoc();
        if (!randomDoc) {
          return;
        }

        await this.workspace.getDoc(randomDoc.workspaceId, randomDoc.docId);
      } catch (e) {
        metrics.doc.counter('auto_merge_pending_doc_updates_error').add(1);
        this.logger.error('Failed to auto merge pending doc updates', e);
      }
    });
  }
}
