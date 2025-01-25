import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { BaseModel } from './base';
import type { FeatureConfigs, WorkspaceFeatureName } from './common';

@Injectable()
export class WorkspaceFeatureModel extends BaseModel {
  async get<T extends WorkspaceFeatureName>(workspaceId: string, name: T) {
    const feature = await this.models.feature.get_unchecked(name);

    const workspaceFeature = await this.db.workspaceFeature.findFirst({
      where: {
        workspaceId,
        featureId: feature.id,
        activated: true,
      },
    });

    if (!workspaceFeature) {
      return null;
    }

    return {
      ...feature,
      configs: this.models.feature.check(name, {
        ...feature.configs,
        ...(workspaceFeature?.configs as {}),
      }),
    };
  }

  async has(workspaceId: string, name: WorkspaceFeatureName) {
    const feature = await this.models.feature.get_unchecked(name);

    const count = await this.db.workspaceFeature.count({
      where: {
        workspaceId,
        featureId: feature.id,
        activated: true,
      },
    });

    return count > 0;
  }

  async list(workspaceId: string) {
    const workspaceFeatures = await this.db.workspaceFeature.findMany({
      include: {
        feature: true,
      },
      where: {
        workspaceId,
        activated: true,
      },
    });

    return workspaceFeatures.map(
      workspaceFeature => workspaceFeature.feature.feature
    ) as WorkspaceFeatureName[];
  }

  @Transactional()
  async add<T extends WorkspaceFeatureName>(
    workspaceId: string,
    featureName: T,
    reason: string,
    overrides?: Partial<FeatureConfigs<T>>
  ) {
    const feature = await this.models.feature.get_unchecked(featureName);

    const existing = await this.db.workspaceFeature.findFirst({
      where: {
        workspaceId,
        featureId: feature.id,
        activated: true,
      },
    });

    if (existing && !overrides) {
      return existing;
    }

    const configs = {
      ...(existing?.configs as {}),
      ...overrides,
    };

    const parseResult = this.models.feature
      .getConfigShape(featureName)
      .partial()
      .safeParse(configs);

    if (!parseResult.success) {
      throw new Error(`Invalid feature config for ${featureName}`, {
        cause: parseResult.error,
      });
    }

    let workspaceFeature;
    if (existing) {
      workspaceFeature = await this.db.workspaceFeature.update({
        where: {
          id: existing.id,
        },
        data: {
          configs: parseResult.data,
          reason,
        },
      });
    } else {
      workspaceFeature = await this.db.workspaceFeature.create({
        data: {
          workspaceId,
          featureId: feature.id,
          activated: true,
          reason,
          configs: parseResult.data,
        },
      });
    }

    this.logger.verbose(
      `Feature ${featureName} added to workspace ${workspaceId}`
    );

    return workspaceFeature;
  }

  async remove(workspaceId: string, featureName: WorkspaceFeatureName) {
    const feature = await this.models.feature.get_unchecked(featureName);

    await this.db.workspaceFeature.deleteMany({
      where: {
        workspaceId,
        featureId: feature.id,
      },
    });

    this.logger.verbose(
      `Feature ${featureName} removed from workspace ${workspaceId}`
    );
  }

  @Transactional()
  async switch<T extends WorkspaceFeatureName>(
    workspaceId: string,
    from: WorkspaceFeatureName,
    to: T,
    reason: string,
    overrides?: Partial<FeatureConfigs<T>>
  ) {
    await this.remove(workspaceId, from);
    return await this.add(workspaceId, to, reason, overrides);
  }
}
