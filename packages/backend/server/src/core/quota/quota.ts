import { pick } from 'lodash-es';

import { PrismaTransaction } from '../../base';
import { formatDate, formatSize, Quota, QuotaSchema } from './types';

const QuotaCache = new Map<number, QuotaConfig>();

export class QuotaConfig {
  readonly config: Quota;
  readonly override?: Partial<Quota['configs']>;

  static async get(tx: PrismaTransaction, featureId: number) {
    const cachedQuota = QuotaCache.get(featureId);

    if (cachedQuota) {
      return cachedQuota;
    }

    const quota = await tx.feature.findFirst({
      where: {
        id: featureId,
      },
    });

    if (!quota) {
      throw new Error(`Quota config ${featureId} not found`);
    }

    const config = new QuotaConfig(quota);
    // we always edit quota config as a new quota config
    // so we can cache it by featureId
    QuotaCache.set(featureId, config);

    return config;
  }

  private constructor(data: any, override?: any) {
    const config = QuotaSchema.safeParse(data);
    if (config.success) {
      this.config = config.data;
    } else {
      throw new Error(
        `Invalid quota config: ${config.error.message}, ${JSON.stringify(
          data
        )})}`
      );
    }
    if (override) {
      const overrideConfig = QuotaSchema.safeParse({
        ...config.data,
        configs: Object.assign({}, config.data.configs, override),
      });
      if (overrideConfig.success) {
        this.override = pick(
          overrideConfig.data.configs,
          Object.keys(override)
        );
      } else {
        throw new Error(
          `Invalid quota override config: ${override.error.message}, ${JSON.stringify(
            data
          )})}`
        );
      }
    }
  }

  withOverride(override: any) {
    if (override) {
      return new QuotaConfig(
        this.config,
        Object.assign({}, this.override, override)
      );
    }
    return this;
  }

  checkOverride(override: any) {
    return QuotaSchema.safeParse({
      ...this.config,
      configs: Object.assign({}, this.config.configs, override),
    });
  }

  get version() {
    return this.config.version;
  }

  /// feature name of quota
  get name() {
    return this.config.feature;
  }

  get blobLimit() {
    return this.override?.blobLimit || this.config.configs.blobLimit;
  }

  get businessBlobLimit() {
    return (
      this.override?.businessBlobLimit ||
      this.config.configs.businessBlobLimit ||
      this.override?.blobLimit ||
      this.config.configs.blobLimit
    );
  }

  private get additionalQuota() {
    const seatQuota =
      this.override?.seatQuota || this.config.configs.seatQuota || 0;
    return this.memberLimit * seatQuota;
  }

  get storageQuota() {
    const baseQuota =
      this.override?.storageQuota || this.config.configs.storageQuota;
    return baseQuota + this.additionalQuota;
  }

  get historyPeriod() {
    return this.override?.historyPeriod || this.config.configs.historyPeriod;
  }

  get memberLimit() {
    return this.override?.memberLimit || this.config.configs.memberLimit;
  }

  get copilotActionLimit() {
    if ('copilotActionLimit' in this.config.configs) {
      return this.config.configs.copilotActionLimit || undefined;
    }
    return undefined;
  }

  get humanReadable() {
    return {
      name: this.config.configs.name,
      blobLimit: formatSize(this.blobLimit),
      storageQuota: formatSize(this.storageQuota),
      historyPeriod: formatDate(this.historyPeriod),
      memberLimit: this.memberLimit.toString(),
      copilotActionLimit: this.copilotActionLimit
        ? `${this.copilotActionLimit} times`
        : 'Unlimited',
    };
  }
}
