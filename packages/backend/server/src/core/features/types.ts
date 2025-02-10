import { Inject, Injectable } from '@nestjs/common';

import { Config } from '../../base';
import { Feature, UserFeatureName } from '../../models';

@Injectable()
export class AvailableUserFeatureConfig {
  @Inject(Config) private readonly config!: Config;

  availableUserFeatures(): Set<UserFeatureName> {
    return new Set([
      Feature.Admin,
      Feature.UnlimitedCopilot,
      Feature.EarlyAccess,
      Feature.AIEarlyAccess,
    ]);
  }

  configurableUserFeatures(): Set<UserFeatureName> {
    return new Set(
      this.config.isSelfhosted
        ? [Feature.Admin, Feature.UnlimitedCopilot]
        : [
            Feature.EarlyAccess,
            Feature.AIEarlyAccess,
            Feature.Admin,
            Feature.UnlimitedCopilot,
          ]
    );
  }
}
