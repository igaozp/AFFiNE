import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import type { EventPayload } from '../../base';
import { FeatureManagementService } from '../../core/features';
import { PermissionService } from '../../core/permission';
import {
  QuotaManagementService,
  QuotaService,
  QuotaType,
} from '../../core/quota';
import { WorkspaceService } from '../../core/workspaces/resolvers';
import { SubscriptionPlan } from './types';

@Injectable()
export class QuotaOverride {
  constructor(
    private readonly quota: QuotaService,
    private readonly manager: QuotaManagementService,
    private readonly permission: PermissionService,
    private readonly workspace: WorkspaceService,
    private readonly feature: FeatureManagementService,
    private readonly quotaService: QuotaService
  ) {}

  @OnEvent('workspace.subscription.activated')
  async onWorkspaceSubscriptionUpdated({
    workspaceId,
    plan,
    recurring,
    quantity,
  }: EventPayload<'workspace.subscription.activated'>) {
    switch (plan) {
      case 'team': {
        const hasTeamWorkspace = await this.quota.hasWorkspaceQuota(
          workspaceId,
          QuotaType.TeamPlanV1
        );
        await this.manager.addTeamWorkspace(
          workspaceId,
          `${recurring} team subscription activated`
        );
        await this.quota.updateWorkspaceConfig(
          workspaceId,
          QuotaType.TeamPlanV1,
          { memberLimit: quantity }
        );
        await this.permission.refreshSeatStatus(workspaceId, quantity);
        if (!hasTeamWorkspace) {
          // this event will triggered when subscription is activated or changed
          // we only send emails when the team workspace is activated
          await this.workspace.sendTeamWorkspaceUpgradedEmail(workspaceId);
        }
        break;
      }
      default:
        break;
    }
  }

  @OnEvent('workspace.subscription.canceled')
  async onWorkspaceSubscriptionCanceled({
    workspaceId,
    plan,
  }: EventPayload<'workspace.subscription.canceled'>) {
    switch (plan) {
      case SubscriptionPlan.Team:
        await this.manager.removeTeamWorkspace(workspaceId);
        break;
      default:
        break;
    }
  }

  @OnEvent('user.subscription.activated')
  async onUserSubscriptionUpdated({
    userId,
    plan,
    recurring,
  }: EventPayload<'user.subscription.activated'>) {
    switch (plan) {
      case SubscriptionPlan.AI:
        await this.feature.addCopilot(userId, 'subscription activated');
        break;
      case SubscriptionPlan.Pro:
        await this.quotaService.switchUserQuota(
          userId,
          recurring === 'lifetime'
            ? QuotaType.LifetimeProPlanV1
            : QuotaType.ProPlanV1,
          'subscription activated'
        );
        break;
      default:
        break;
    }
  }

  @OnEvent('user.subscription.canceled')
  async onUserSubscriptionCanceled({
    userId,
    plan,
  }: EventPayload<'user.subscription.canceled'>) {
    switch (plan) {
      case SubscriptionPlan.AI:
        await this.feature.removeCopilot(userId);
        break;
      case SubscriptionPlan.Pro: {
        // edge case: when user switch from recurring Pro plan to `Lifetime` plan,
        // a subscription canceled event will be triggered because `Lifetime` plan is not subscription based
        const quota = await this.quotaService.getUserQuota(userId);
        if (quota.feature.name !== QuotaType.LifetimeProPlanV1) {
          await this.quotaService.switchUserQuota(
            userId,
            QuotaType.FreePlanV1,
            'subscription canceled'
          );
        }
        break;
      }
      default:
        break;
    }
  }
}
