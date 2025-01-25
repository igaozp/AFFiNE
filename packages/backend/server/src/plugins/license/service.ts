import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InstalledLicense, PrismaClient } from '@prisma/client';

import {
  EventEmitter,
  type EventPayload,
  InternalServerError,
  LicenseNotFound,
  OnEvent,
  UserFriendlyError,
  WorkspaceLicenseAlreadyExists,
} from '../../base';
import { PermissionService } from '../../core/permission';
import { QuotaManagementService, QuotaType } from '../../core/quota';
import { SubscriptionPlan, SubscriptionRecurring } from '../payment/types';

interface License {
  plan: SubscriptionPlan;
  recurring: SubscriptionRecurring;
  quantity: number;
  endAt: number;
}

@Injectable()
export class LicenseService {
  private readonly logger = new Logger(LicenseService.name);

  constructor(
    private readonly db: PrismaClient,
    private readonly quota: QuotaManagementService,
    private readonly event: EventEmitter,
    private readonly permission: PermissionService
  ) {}

  async getLicense(workspaceId: string) {
    return this.db.installedLicense.findUnique({
      select: {
        installedAt: true,
        validatedAt: true,
        expiredAt: true,
        quantity: true,
        recurring: true,
      },
      where: {
        workspaceId,
      },
    });
  }

  async activateTeamLicense(workspaceId: string, licenseKey: string) {
    const installedLicense = await this.getLicense(workspaceId);

    if (installedLicense) {
      throw new WorkspaceLicenseAlreadyExists();
    }

    const data = await this.fetch<License>(
      `/api/team/licenses/${licenseKey}/activate`,
      {
        method: 'POST',
      }
    );

    const license = await this.db.installedLicense.upsert({
      where: {
        workspaceId,
      },
      update: {
        key: licenseKey,
        validatedAt: new Date(),
        validateKey: data.res.headers.get('x-next-validate-key') ?? '',
        expiredAt: new Date(data.endAt),
        recurring: data.recurring,
        quantity: data.quantity,
      },
      create: {
        workspaceId,
        key: licenseKey,
        expiredAt: new Date(data.endAt),
        validatedAt: new Date(),
        validateKey: data.res.headers.get('x-next-validate-key') ?? '',
        recurring: data.recurring,
        quantity: data.quantity,
      },
    });

    this.event.emit('workspace.subscription.activated', {
      workspaceId,
      plan: data.plan,
      recurring: data.recurring,
      quantity: data.quantity,
    });
    return license;
  }

  async deactivateTeamLicense(workspaceId: string) {
    const license = await this.db.installedLicense.findUnique({
      where: {
        workspaceId,
      },
    });

    if (!license) {
      throw new LicenseNotFound();
    }

    await this.fetch(`/api/team/licenses/${license.key}/deactivate`, {
      method: 'POST',
    });

    await this.db.installedLicense.deleteMany({
      where: {
        workspaceId,
      },
    });

    this.event.emit('workspace.subscription.canceled', {
      workspaceId,
      plan: SubscriptionPlan.SelfHostedTeam,
      recurring: SubscriptionRecurring.Monthly,
    });
  }

  async updateTeamRecurring(key: string, recurring: SubscriptionRecurring) {
    await this.fetch(`/api/team/licenses/${key}/recurring`, {
      method: 'POST',
      body: JSON.stringify({
        recurring,
      }),
    });
  }

  async createCustomerPortal(workspaceId: string) {
    const license = await this.db.installedLicense.findUnique({
      where: {
        workspaceId,
      },
    });

    if (!license) {
      throw new LicenseNotFound();
    }

    return this.fetch<{ url: string }>(
      `/api/team/licenses/${license.key}/create-customer-portal`,
      {
        method: 'POST',
      }
    );
  }

  @OnEvent('workspace.members.updated')
  async updateTeamSeats(payload: EventPayload<'workspace.members.updated'>) {
    const { workspaceId, count } = payload;

    const license = await this.db.installedLicense.findUnique({
      where: {
        workspaceId,
      },
    });

    if (!license) {
      return;
    }

    await this.fetch(`/api/team/licenses/${license.key}/seats`, {
      method: 'POST',
      body: JSON.stringify({
        quantity: count,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // stripe payment is async, we can't directly the charge result in update calling
    await this.waitUntilLicenseUpdated(license, count);
  }

  private async waitUntilLicenseUpdated(
    license: InstalledLicense,
    memberRequired: number
  ) {
    let tried = 0;
    while (tried++ < 10) {
      try {
        const res = await this.revalidateLicense(license);

        if (res?.quantity === memberRequired) {
          break;
        }
      } catch (e) {
        this.logger.error('Failed to check license health', e);
      }

      await new Promise(resolve => setTimeout(resolve, tried * 2000));
    }

    // fallback to health check if we can't get the upgrade result immediately
    throw new Error('Timeout checking seat update result.');
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async licensesHealthCheck() {
    const licenses = await this.db.installedLicense.findMany({
      where: {
        validatedAt: {
          lte: new Date(Date.now() - 1000 * 60 * 60),
        },
      },
    });

    for (const license of licenses) {
      await this.revalidateLicense(license);
    }
  }

  private async revalidateLicense(license: InstalledLicense) {
    try {
      const res = await this.fetch<License>(
        `/api/team/licenses/${license.key}/health`
      );

      await this.db.installedLicense.update({
        where: {
          key: license.key,
        },
        data: {
          validatedAt: new Date(),
          validateKey: res.res.headers.get('x-next-validate-key') ?? '',
          quantity: res.quantity,
          recurring: res.recurring,
          expiredAt: new Date(res.endAt),
        },
      });

      this.event.emit('workspace.subscription.activated', {
        workspaceId: license.workspaceId,
        plan: res.plan,
        recurring: res.recurring,
        quantity: res.quantity,
      });

      return res;
    } catch (e) {
      this.logger.error('Failed to revalidate license', e);

      // only treat known error as invalid license response
      if (
        e instanceof UserFriendlyError &&
        e.name !== 'internal_server_error'
      ) {
        this.event.emit('workspace.subscription.canceled', {
          workspaceId: license.workspaceId,
          plan: SubscriptionPlan.SelfHostedTeam,
          recurring: SubscriptionRecurring.Monthly,
        });
      }

      return null;
    }
  }

  private async fetch<T = any>(
    path: string,
    init?: RequestInit
  ): Promise<T & { res: Response }> {
    try {
      const res = await fetch('https://app.affine.pro' + path, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const body = (await res.json()) as UserFriendlyError;
        throw new UserFriendlyError(
          body.type as any,
          body.name as any,
          body.message,
          body.data
        );
      }

      const data = (await res.json()) as T;
      return {
        ...data,
        res,
      };
    } catch (e) {
      if (e instanceof UserFriendlyError) {
        throw e;
      }

      throw new InternalServerError(
        e instanceof Error
          ? e.message
          : 'Failed to contact with https://app.affine.pro'
      );
    }
  }

  @OnEvent('workspace.subscription.activated')
  async onWorkspaceSubscriptionUpdated({
    workspaceId,
    plan,
    recurring,
    quantity,
  }: EventPayload<'workspace.subscription.activated'>) {
    switch (plan) {
      case SubscriptionPlan.SelfHostedTeam:
        await this.quota.addTeamWorkspace(
          workspaceId,
          `${recurring} team subscription activated`
        );
        await this.quota.updateWorkspaceConfig(
          workspaceId,
          QuotaType.TeamPlanV1,
          { memberLimit: quantity }
        );
        await this.permission.refreshSeatStatus(workspaceId, quantity);
        break;
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
      case SubscriptionPlan.SelfHostedTeam:
        await this.quota.removeTeamWorkspace(workspaceId);
        break;
      default:
        break;
    }
  }
}
