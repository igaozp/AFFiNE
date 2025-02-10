import assert from 'node:assert';

import type { RawBodyRequest } from '@nestjs/common';
import { Controller, Logger, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import Stripe from 'stripe';

import { Config, EventBus, InternalServerError } from '../../base';
import { Public } from '../../core/auth';

@Controller('/api/stripe')
export class StripeWebhookController {
  private readonly webhookKey: string;
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    config: Config,
    private readonly stripe: Stripe,
    private readonly event: EventBus
  ) {
    assert(config.plugins.payment.stripe);
    this.webhookKey = config.plugins.payment.stripe.keys.webhookKey;
  }

  @Public()
  @Post('/webhook')
  async handleWebhook(@Req() req: RawBodyRequest<Request>) {
    // Retrieve the event by verifying the signature using the raw body and secret.
    const signature = req.headers['stripe-signature'];
    try {
      const event = this.stripe.webhooks.constructEvent(
        req.rawBody ?? '',
        signature ?? '',
        this.webhookKey
      );

      this.logger.debug(
        `[${event.id}] Stripe Webhook {${event.type}} received.`
      );

      // Stripe requires responseing webhook immediately and handle event asynchronously.
      setImmediate(() => {
        this.event.emitAsync(`stripe.${event.type}` as any, event).catch(e => {
          this.logger.error('Failed to handle Stripe Webhook event.', e);
        });
      });
    } catch (err: any) {
      throw new InternalServerError(err.message);
    }
  }
}
