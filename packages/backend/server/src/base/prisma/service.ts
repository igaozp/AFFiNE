import type { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnApplicationShutdown
{
  static INSTANCE: PrismaService | null = null;

  constructor(opts: Prisma.PrismaClientOptions) {
    super(opts);
    PrismaService.INSTANCE = this;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onApplicationShutdown(): Promise<void> {
    if (!AFFiNE.node.test) {
      await this.$disconnect();
      PrismaService.INSTANCE = null;
    }
  }
}
