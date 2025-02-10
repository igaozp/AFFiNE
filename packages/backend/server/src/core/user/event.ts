import { Injectable, Logger } from '@nestjs/common';

import { Config, OnEvent } from '../../base';

@Injectable()
export class UserEventsListener {
  private readonly logger = new Logger(UserEventsListener.name);

  constructor(private readonly config: Config) {}

  @OnEvent('user.updated')
  async onUserUpdated(user: Events['user.updated']) {
    const { enabled, customerIo } = this.config.metrics;
    if (enabled && customerIo?.token) {
      const payload = {
        name: user.name,
        email: user.email,
        created_at: Number(user.createdAt) / 1000,
      };
      try {
        await fetch(`https://track.customer.io/api/v1/customers/${user.id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Basic ${customerIo.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } catch (e) {
        this.logger.error('Failed to publish user update event:', e);
      }
    }
  }

  @OnEvent('user.deleted')
  async onUserDeleted(user: Events['user.deleted']) {
    const { enabled, customerIo } = this.config.metrics;
    if (enabled && customerIo?.token) {
      try {
        if (user.emailVerifiedAt) {
          // suppress email if email is verified
          await fetch(
            `https://track.customer.io/api/v1/customers/${user.email}/suppress`,
            {
              method: 'POST',
              headers: {
                Authorization: `Basic ${customerIo.token}`,
              },
            }
          );
        }
        await fetch(`https://track.customer.io/api/v1/customers/${user.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Basic ${customerIo.token}` },
        });
      } catch (e) {
        this.logger.error('Failed to publish user delete event:', e);
      }
    }
  }
}
