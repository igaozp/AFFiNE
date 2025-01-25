import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { PrismaTransaction } from '../../base';
import { FeatureKind } from '../features/types';
import { QuotaConfig } from './quota';
import { QuotaType } from './types';

@Injectable()
export class QuotaService {
  constructor(private readonly prisma: PrismaClient) {}

  async getQuota<Q extends QuotaType>(
    quota: Q,
    tx?: PrismaTransaction
  ): Promise<QuotaConfig | undefined> {
    const executor = tx ?? this.prisma;

    const data = await executor.feature.findFirst({
      where: { feature: quota, type: FeatureKind.Quota },
      select: { id: true },
      orderBy: { version: 'desc' },
    });

    if (data) {
      return QuotaConfig.get(this.prisma, data.id);
    }
    return undefined;
  }

  // ======== User Quota ========

  // get activated user quota
  async getUserQuota(userId: string) {
    const quota = await this.prisma.userFeature.findFirst({
      where: {
        userId,
        feature: { type: FeatureKind.Quota },
        activated: true,
      },
      select: {
        reason: true,
        createdAt: true,
        expiredAt: true,
        featureId: true,
      },
    });

    if (!quota) {
      // this should unreachable
      throw new Error(`User ${userId} has no quota`);
    }

    const feature = await QuotaConfig.get(this.prisma, quota.featureId);
    return { ...quota, feature };
  }

  // get user all quota records
  async getUserQuotas(userId: string) {
    const quotas = await this.prisma.userFeature.findMany({
      where: {
        userId,
        feature: { type: FeatureKind.Quota },
      },
      select: {
        activated: true,
        reason: true,
        createdAt: true,
        expiredAt: true,
        featureId: true,
      },
      orderBy: { id: 'asc' },
    });
    const configs = await Promise.all(
      quotas.map(async quota => {
        try {
          return {
            ...quota,
            feature: await QuotaConfig.get(this.prisma, quota.featureId),
          };
        } catch {}
        return null as unknown as typeof quota & {
          feature: QuotaConfig;
        };
      })
    );

    return configs.filter(quota => !!quota);
  }

  // switch user to a new quota
  // currently each user can only have one quota
  async switchUserQuota(
    userId: string,
    quota: QuotaType,
    reason?: string,
    expiredAt?: Date
  ) {
    await this.prisma.$transaction(async tx => {
      const hasSameActivatedQuota = await this.hasUserQuota(userId, quota, tx);
      if (hasSameActivatedQuota) return; // don't need to switch

      const featureId = await tx.feature
        .findFirst({
          where: { feature: quota, type: FeatureKind.Quota },
          select: { id: true },
          orderBy: { version: 'desc' },
        })
        .then(f => f?.id);

      if (!featureId) {
        throw new Error(`Quota ${quota} not found`);
      }

      // we will deactivate all exists quota for this user
      await tx.userFeature.updateMany({
        where: {
          id: undefined,
          userId,
          feature: {
            type: FeatureKind.Quota,
          },
        },
        data: {
          activated: false,
        },
      });

      await tx.userFeature.create({
        data: {
          userId,
          featureId,
          reason: reason ?? 'switch quota',
          activated: true,
          expiredAt,
        },
      });
    });
  }

  async hasUserQuota(userId: string, quota: QuotaType, tx?: PrismaTransaction) {
    const executor = tx ?? this.prisma;

    return executor.userFeature
      .count({
        where: {
          userId,
          feature: {
            feature: quota,
            type: FeatureKind.Quota,
          },
          activated: true,
        },
      })
      .then(count => count > 0);
  }

  // ======== Workspace Quota ========

  // get activated workspace quota
  async getWorkspaceQuota(workspaceId: string) {
    const quota = await this.prisma.workspaceFeature.findFirst({
      where: {
        workspaceId,
        feature: { type: FeatureKind.Quota },
        activated: true,
      },
      select: {
        configs: true,
        reason: true,
        createdAt: true,
        expiredAt: true,
        featureId: true,
      },
    });

    if (quota) {
      const feature = await QuotaConfig.get(this.prisma, quota.featureId);
      const { configs, ...rest } = quota;
      return { ...rest, feature: feature.withOverride(configs) };
    }
    return null;
  }

  // switch user to a new quota
  // currently each user can only have one quota
  async switchWorkspaceQuota(
    workspaceId: string,
    quota: QuotaType,
    reason?: string,
    expiredAt?: Date
  ) {
    await this.prisma.$transaction(async tx => {
      const hasSameActivatedQuota = await this.hasWorkspaceQuota(
        workspaceId,
        quota,
        tx
      );
      if (hasSameActivatedQuota) return; // don't need to switch

      const featureId = await tx.feature
        .findFirst({
          where: { feature: quota, type: FeatureKind.Quota },
          select: { id: true },
          orderBy: { version: 'desc' },
        })
        .then(f => f?.id);

      if (!featureId) {
        throw new Error(`Quota ${quota} not found`);
      }

      // we will deactivate all exists quota for this workspace
      await this.deactivateWorkspaceQuota(workspaceId, undefined, tx);

      await tx.workspaceFeature.create({
        data: {
          workspaceId,
          featureId,
          reason: reason ?? 'switch quota',
          activated: true,
          expiredAt,
        },
      });
    });
  }

  async deactivateWorkspaceQuota(
    workspaceId: string,
    quota?: QuotaType,
    tx?: PrismaTransaction
  ) {
    const executor = tx ?? this.prisma;

    await executor.workspaceFeature.updateMany({
      where: {
        id: undefined,
        workspaceId,
        feature: quota
          ? { feature: quota, type: FeatureKind.Quota }
          : { type: FeatureKind.Quota },
      },
      data: { activated: false },
    });
  }

  async hasWorkspaceQuota(
    workspaceId: string,
    quota: QuotaType,
    tx?: PrismaTransaction
  ) {
    const executor = tx ?? this.prisma;

    return executor.workspaceFeature
      .count({
        where: {
          workspaceId,
          feature: {
            feature: quota,
            type: FeatureKind.Quota,
          },
          activated: true,
        },
      })
      .then(count => count > 0);
  }

  /// check if workspaces have quota
  /// return workspaces's id that have quota
  async hasWorkspacesQuota(
    workspaces: string[],
    quota?: QuotaType
  ): Promise<string[]> {
    const workspaceIds = await this.prisma.workspaceFeature.findMany({
      where: {
        workspaceId: { in: workspaces },
        feature: { feature: quota, type: FeatureKind.Quota },
        activated: true,
      },
      select: { workspaceId: true },
    });
    return Array.from(new Set(workspaceIds.map(w => w.workspaceId)));
  }

  async getWorkspaceConfig<Q extends QuotaType>(
    workspaceId: string,
    type: Q
  ): Promise<QuotaConfig | undefined> {
    const quota = await this.getQuota(type);
    if (quota) {
      const configs = await this.prisma.workspaceFeature
        .findFirst({
          where: {
            workspaceId,
            feature: { feature: type, type: FeatureKind.Quota },
            activated: true,
          },
          select: { configs: true },
        })
        .then(q => q?.configs);
      return quota.withOverride(configs);
    }
    return undefined;
  }

  async updateWorkspaceConfig(
    workspaceId: string,
    quota: QuotaType,
    configs: any
  ) {
    const current = await this.getWorkspaceConfig(workspaceId, quota);

    const ret = current?.checkOverride(configs);
    if (!ret || !ret.success) {
      throw new Error(
        `Invalid quota config: ${ret?.error.message || 'quota not defined'}`
      );
    }
    const r = await this.prisma.workspaceFeature.updateMany({
      where: {
        workspaceId,
        feature: { feature: quota, type: FeatureKind.Quota },
        activated: true,
      },
      data: { configs },
    });
    return r.count;
  }
}
