import type { Prisma } from '@prisma/client';

import { defineStartupConfig, ModuleConfig } from '../config';

interface PrismaStartupConfiguration extends Prisma.PrismaClientOptions {
  datasourceUrl: string;
}

declare module '../config' {
  interface AppConfig {
    prisma: ModuleConfig<PrismaStartupConfiguration>;
  }
}

defineStartupConfig('prisma', {
  datasourceUrl: '',
});
