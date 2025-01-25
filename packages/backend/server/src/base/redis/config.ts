import { RedisOptions } from 'ioredis';

import { defineStartupConfig, ModuleConfig } from '../../base/config';

declare module '../config' {
  interface AppConfig {
    redis: ModuleConfig<RedisOptions>;
  }
}

defineStartupConfig('redis', {});
