import { Injectable } from '@nestjs/common';
import { PrismaClient, UserStripeCustomer } from '@prisma/client';
import { omit, pick } from 'lodash-es';
import Stripe from 'stripe';
import { z } from 'zod';

import {
  EventBus,
  OnEvent,
  SubscriptionAlreadyExists,
  SubscriptionPlanNotFound,
  URLHelper,
} from '../../../base';
import {
  KnownStripeInvoice,
  KnownStripePrice,
  KnownStripeSubscription,
  LookupKey,
  retriveLookupKeyFromStripeSubscription,
  SubscriptionPlan,
  SubscriptionRecurring,
  SubscriptionStatus,
} from '../types';
import {
  CheckoutParams,
  Invoice,
  Subscription,
  SubscriptionManager,
} from './common';

export const WorkspaceSubscriptionIdentity = z.object({
  plan: z.literal(SubscriptionPlan.Team),
  workspaceId: z.string(),
});

export const WorkspaceSubscriptionCheckoutArgs = z.object({
  plan: z.literal(SubscriptionPlan.Team),
  workspaceId: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
  }),
});

@Injectable()
export class WorkspaceSubscriptionManager extends SubscriptionManager {
  constructor(
    stripe: Stripe,
    db: PrismaClient,
    private readonly url: URLHelper,
    private readonly event: EventBus
  ) {
    super(stripe, db);
  }

  filterPrices(
    prices: KnownStripePrice[],
    _customer?: UserStripeCustomer
  ): KnownStripePrice[] {
    return prices.filter(
      price => price.lookupKey.plan === SubscriptionPlan.Team
    );
  }

  async checkout(
    lookupKey: LookupKey,
    params: z.infer<typeof CheckoutParams>,
    args: z.infer<typeof WorkspaceSubscriptionCheckoutArgs>
  ) {
    const subscription = await this.getSubscription({
      plan: SubscriptionPlan.Team,
      workspaceId: args.workspaceId,
    });

    if (subscription) {
      throw new SubscriptionAlreadyExists({ plan: SubscriptionPlan.Team });
    }

    const price = await this.getPrice(lookupKey);

    if (!price) {
      throw new SubscriptionPlanNotFound({
        plan: lookupKey.plan,
        recurring: lookupKey.recurring,
      });
    }

    const customer = await this.getOrCreateCustomer(args.user.id);

    const discounts = await (async () => {
      if (params.coupon) {
        const couponId = await this.getCouponFromPromotionCode(
          params.coupon,
          customer
        );
        if (couponId) {
          return { discounts: [{ coupon: couponId }] };
        }
      }

      return { allow_promotion_codes: true };
    })();

    const count = await this.db.workspaceUserPermission.count({
      where: {
        workspaceId: args.workspaceId,
      },
    });

    return this.stripe.checkout.sessions.create({
      customer: customer.stripeCustomerId,
      line_items: [
        {
          price: price.price.id,
          quantity: count,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        metadata: {
          workspaceId: args.workspaceId,
        },
      },
      ...discounts,
      success_url: this.url.link(params.successCallbackLink),
    });
  }

  async saveStripeSubscription(subscription: KnownStripeSubscription) {
    const { lookupKey, stripeSubscription } = subscription;

    const workspaceId = stripeSubscription.metadata.workspaceId;

    if (!workspaceId) {
      throw new Error(
        'Workspace ID is required in workspace subscription metadata'
      );
    }

    const subscriptionData = this.transformSubscription(subscription);

    this.event.emit('workspace.subscription.activated', {
      workspaceId,
      plan: lookupKey.plan,
      recurring: lookupKey.recurring,
      quantity: subscriptionData.quantity,
    });

    return this.db.subscription.upsert({
      where: {
        stripeSubscriptionId: stripeSubscription.id,
      },
      update: {
        ...pick(subscriptionData, [
          'status',
          'stripeScheduleId',
          'nextBillAt',
          'canceledAt',
          'quantity',
        ]),
      },
      create: {
        targetId: workspaceId,
        ...subscriptionData,
      },
    });
  }

  async deleteStripeSubscription({
    lookupKey,
    stripeSubscription,
  }: KnownStripeSubscription) {
    const workspaceId = stripeSubscription.metadata.workspaceId;

    if (!workspaceId) {
      throw new Error(
        'Workspace ID is required in workspace subscription metadata'
      );
    }

    const deleted = await this.db.subscription.deleteMany({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (deleted.count > 0) {
      this.event.emit('workspace.subscription.canceled', {
        workspaceId,
        plan: lookupKey.plan,
        recurring: lookupKey.recurring,
      });
    }
  }

  getSubscription(identity: z.infer<typeof WorkspaceSubscriptionIdentity>) {
    return this.db.subscription.findFirst({
      where: {
        targetId: identity.workspaceId,
        status: {
          in: [SubscriptionStatus.Active, SubscriptionStatus.Trialing],
        },
      },
    });
  }

  async cancelSubscription(subscription: Subscription) {
    return await this.db.subscription.update({
      where: {
        // @ts-expect-error checked outside
        stripeSubscriptionId: subscription.stripeSubscriptionId,
      },
      data: {
        canceledAt: new Date(),
        nextBillAt: null,
      },
    });
  }

  resumeSubscription(subscription: Subscription): Promise<Subscription> {
    return this.db.subscription.update({
      where: {
        // @ts-expect-error checked outside
        stripeSubscriptionId: subscription.stripeSubscriptionId,
      },
      data: {
        canceledAt: null,
        nextBillAt: subscription.end,
      },
    });
  }

  updateSubscriptionRecurring(
    subscription: Subscription,
    recurring: SubscriptionRecurring
  ): Promise<Subscription> {
    return this.db.subscription.update({
      where: {
        // @ts-expect-error checked outside
        stripeSubscriptionId: subscription.stripeSubscriptionId,
      },
      data: { recurring },
    });
  }

  async saveInvoice(knownInvoice: KnownStripeInvoice): Promise<Invoice> {
    const { metadata, stripeInvoice } = knownInvoice;

    const workspaceId = metadata.workspaceId;

    if (!workspaceId) {
      throw new Error('Workspace ID is required in workspace invoice metadata');
    }

    const invoiceData = await this.transformInvoice(knownInvoice);

    return this.db.invoice.upsert({
      where: {
        stripeInvoiceId: stripeInvoice.id,
      },
      update: omit(invoiceData, 'stripeInvoiceId'),
      create: {
        targetId: workspaceId,
        ...invoiceData,
      },
    });
  }

  @OnEvent('workspace.members.updated')
  async onMembersUpdated({
    workspaceId,
    count,
  }: Events['workspace.members.updated']) {
    const subscription = await this.getSubscription({
      plan: SubscriptionPlan.Team,
      workspaceId,
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      return;
    }
    const stripeSubscription = await this.stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId
    );

    const lookupKey =
      retriveLookupKeyFromStripeSubscription(stripeSubscription);

    await this.stripe.subscriptions.update(stripeSubscription.id, {
      items: [
        {
          id: stripeSubscription.items.data[0].id,
          quantity: count,
        },
      ],
      payment_behavior: 'pending_if_incomplete',
      proration_behavior:
        lookupKey?.recurring === SubscriptionRecurring.Yearly
          ? 'always_invoice'
          : 'none',
    });

    if (subscription.stripeScheduleId) {
      const schedule = await this.scheduleManager.fromSchedule(
        subscription.stripeScheduleId
      );
      await schedule.updateQuantity(count);
    }
  }
}
