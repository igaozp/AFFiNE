import { defineStartupConfig, ModuleConfig } from '../../base/config';

interface DocServiceStartupConfigurations {
  /**
   * The endpoint of the doc service.
   * Example: http://doc-service:3020
   */
  endpoint: string;
}

declare module '../../base/config' {
  interface AppConfig {
    docService: ModuleConfig<DocServiceStartupConfigurations>;
  }
}

defineStartupConfig('docService', {
  endpoint: '',
});
