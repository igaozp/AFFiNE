import type { ClientOptions as OpenAIClientOptions } from 'openai';

import { defineStartupConfig, ModuleConfig } from '../../base/config';
import { StorageConfig } from '../../base/storage/config';
import type { FalConfig } from './providers/fal';
import { PerplexityConfig } from './providers/perplexity';

export interface CopilotStartupConfigurations {
  openai?: OpenAIClientOptions;
  fal?: FalConfig;
  perplexity?: PerplexityConfig;
  test?: never;
  unsplashKey?: string;
  storage: StorageConfig;
}

declare module '../config' {
  interface PluginsConfig {
    copilot: ModuleConfig<CopilotStartupConfigurations>;
  }
}

defineStartupConfig('plugins.copilot', {
  storage: {
    provider: 'fs',
    bucket: 'copilot',
  },
});
