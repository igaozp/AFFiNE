import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { BaseModel } from './base';
import type { UserFeatureName } from './common';

@Injectable()
export class UserFeatureModel extends BaseModel {
  async get<T extends UserFeatureName>(userId: string, name: T) {
    // TODO(@forehalo):
    // all feature query-and-use queries should be simplified like the below when `feature(name)` becomes a unique index
    //
    // this.db.userFeature.findFirst({
    //   include: {
    //     feature: true
    //   },
    //   where: {
    //     userId,
    //     activated: true,
    //     feature: {
    //       feature: name,
    //     }
    //   }
    // })
    const feature = await this.models.feature.get(name);

    const count = await this.db.userFeature.count({
      where: {
        userId,
        featureId: feature.id,
        activated: true,
      },
    });

    return count > 0 ? feature : null;
  }

  async has(userId: string, name: UserFeatureName) {
    const feature = await this.models.feature.get_unchecked(name);

    const count = await this.db.userFeature.count({
      where: {
        userId,
        featureId: feature.id,
        activated: true,
      },
    });

    return count > 0;
  }

  async list(userId: string) {
    const userFeatures = await this.db.userFeature.findMany({
      include: {
        feature: true,
      },
      where: {
        userId,
        activated: true,
      },
    });

    return userFeatures.map(
      userFeature => userFeature.feature.feature
    ) as UserFeatureName[];
  }

  async add(userId: string, featureName: UserFeatureName, reason: string) {
    const feature = await this.models.feature.get_unchecked(featureName);

    const existing = await this.db.userFeature.findFirst({
      where: {
        userId,
        featureId: feature.id,
        activated: true,
      },
    });

    if (existing) {
      return existing;
    }

    const userFeature = await this.db.userFeature.create({
      data: {
        userId,
        featureId: feature.id,
        activated: true,
        reason,
      },
    });

    this.logger.verbose(`Feature ${featureName} added to user ${userId}`);

    return userFeature;
  }

  async remove(userId: string, featureName: UserFeatureName) {
    const feature = await this.models.feature.get_unchecked(featureName);

    await this.db.userFeature.deleteMany({
      where: {
        userId,
        featureId: feature.id,
      },
    });

    this.logger.verbose(`Feature ${featureName} removed from user ${userId}`);
  }

  @Transactional()
  async switch(
    userId: string,
    from: UserFeatureName,
    to: UserFeatureName,
    reason: string
  ) {
    await this.remove(userId, from);
    await this.add(userId, to, reason);
  }
}
