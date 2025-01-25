import { DynamicModule, FactoryProvider } from '@nestjs/common';
import { merge } from 'lodash-es';

import { AFFiNEConfig } from './def';
import { Config } from './provider';

export * from './def';
export * from './default';
export { applyEnvToConfig, parseEnvValue } from './env';
export * from './provider';
export { defineRuntimeConfig, defineStartupConfig } from './register';
export type { AppConfig, ConfigItem, ModuleConfig } from './types';

function createConfigProvider(
  override?: DeepPartial<Config>
): FactoryProvider<Config> {
  return {
    provide: Config,
    useFactory: () => {
      return Object.freeze(merge({}, globalThis.AFFiNE, override));
    },
    inject: [],
  };
}

export class ConfigModule {
  static forRoot = (override?: DeepPartial<AFFiNEConfig>): DynamicModule => {
    const provider = createConfigProvider(override);

    return {
      global: true,
      module: ConfigModule,
      providers: [provider],
      exports: [provider],
    };
  };
}
