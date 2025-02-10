import {
  defineRuntimeConfig,
  defineStartupConfig,
  ModuleConfig,
} from '../../base/config';
import { CaptchaConfig } from './types';

declare module '../config' {
  interface PluginsConfig {
    captcha: ModuleConfig<
      CaptchaConfig,
      {
        enable: boolean;
      }
    >;
  }
}

declare module '../../base/guard' {
  interface RegisterGuardName {
    captcha: 'captcha';
  }
}

defineStartupConfig('plugins.captcha', {
  turnstile: {
    secret: '',
  },
  challenge: {
    bits: 20,
  },
});

defineRuntimeConfig('plugins.captcha', {
  enable: {
    desc: 'Check captcha challenge when user authenticating the app.',
    default: false,
  },
});
