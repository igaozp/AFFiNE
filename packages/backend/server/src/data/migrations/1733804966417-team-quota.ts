import { PrismaClient } from '@prisma/client';

import { QuotaType } from '../../core/quota';
import { upsertLatestQuotaVersion } from './utils/user-quotas';

export class TeamQuota1733804966417 {
  // do the migration
  static async up(db: PrismaClient) {
    await upsertLatestQuotaVersion(db, QuotaType.TeamPlanV1);
  }

  // revert the migration
  static async down(_db: PrismaClient) {}
}
