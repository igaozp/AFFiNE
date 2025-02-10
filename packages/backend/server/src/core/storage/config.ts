import { defineStartupConfig, ModuleConfig } from '../../base/config';
import { StorageProviderType } from '../../base/storage';

export type StorageConfig<Ext = unknown> = {
  provider: StorageProviderType;
  bucket: string;
} & Ext;

export interface StorageStartupConfigurations {
  avatar: StorageConfig<{
    publicLinkFactory: (key: string) => string;
    keyInPublicLink: (link: string) => string;
  }>;
  blob: StorageConfig;
}

declare module '../../base/config' {
  interface AppConfig {
    storages: ModuleConfig<StorageStartupConfigurations>;
  }
}

defineStartupConfig('storages', {
  avatar: {
    provider: 'fs',
    bucket: 'avatars',
    publicLinkFactory: key => `/api/avatars/${key}`,
    keyInPublicLink: link => link.split('/').pop() as string,
  },
  blob: {
    provider: 'fs',
    bucket: 'blobs',
  },
});
