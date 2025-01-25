import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import Stripe from 'stripe';

import { SubscriptionService } from './service';

const OnStripeEvent = (
  event: Stripe.Event.Type,
  opts?: Parameters<typeof OnEvent>[1]
) => OnEvent(`stripe:${event}`, opts);

/**
 * Stripe webhook events sent in random order, and may be even sent more than once.
 *
 * A good way to avoid events sequence issue is fetch the latest object data regarding that event,
 * and all following operations only depend on the latest state instead of the one in event data.
 */
@Injectable()
export class StripeWebhook {
  constructor(
    private readonly service: SubscriptionService,
    private readonly stripe: Stripe
  ) {}

  @OnStripeEvent('invoice.created')
  @OnStripeEvent('invoice.updated')
  @OnStripeEvent('invoice.finalization_failed')
  @OnStripeEvent('invoice.payment_failed')
  @OnStripeEvent('invoice.paid')
  async onInvoiceUpdated(
    event:
      | Stripe.InvoiceCreatedEvent
      | Stripe.InvoiceUpdatedEvent
      | Stripe.InvoiceFinalizationFailedEvent
      | Stripe.InvoicePaymentFailedEvent
      | Stripe.InvoicePaidEvent
  ) {
    const invoice = await this.stripe.invoices.retrieve(event.data.object.id);
    await this.service.saveStripeInvoice(invoice);
  }

  @OnStripeEvent('customer.subscription.created')
  @OnStripeEvent('customer.subscription.updated')
  async onSubscriptionChanges(
    event:
      | Stripe.CustomerSubscriptionUpdatedEvent
      | Stripe.CustomerSubscriptionCreatedEvent
  ) {
    const subscription = await this.stripe.subscriptions.retrieve(
      event.data.object.id,
      {
        expand: ['customer'],
      }
    );

    await this.service.saveStripeSubscription(subscription);
  }

  @OnStripeEvent('customer.subscription.deleted')
  async onSubscriptionDeleted(event: Stripe.CustomerSubscriptionDeletedEvent) {
    await this.service.deleteStripeSubscription(event.data.object);
  }
}
