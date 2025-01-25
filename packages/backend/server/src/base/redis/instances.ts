import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis as IORedis, RedisOptions } from 'ioredis';

import { Config } from '../../base/config';

class Redis extends IORedis implements OnModuleDestroy {
  constructor(opts: RedisOptions) {
    super(opts);
  }

  onModuleDestroy() {
    this.disconnect();
  }
}

@Injectable()
export class CacheRedis extends Redis {
  constructor(config: Config) {
    super(config.redis);
  }
}

@Injectable()
export class SessionRedis extends Redis {
  constructor(config: Config) {
    super({ ...config.redis, db: (config.redis.db ?? 0) + 2 });
  }
}

@Injectable()
export class SocketIoRedis extends Redis {
  constructor(config: Config) {
    super({ ...config.redis, db: (config.redis.db ?? 0) + 3 });
  }
}
