import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { Models } from '../../models';

@Injectable()
export class AuthCronJob {
  constructor(private readonly models: Models) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanExpiredUserSessions() {
    await this.models.session.cleanExpiredUserSessions();
  }
}
