import { GatewayMetadata } from '@nestjs/websockets';
import { Socket } from 'socket.io';

import { defineStartupConfig, ModuleConfig } from '../config';

declare module '../config' {
  interface AppConfig {
    websocket: ModuleConfig<
      GatewayMetadata & {
        canActivate?: (socket: Socket) => Promise<boolean>;
      }
    >;
  }
}

defineStartupConfig('websocket', {
  transports: ['websocket', 'polling'],
  // see: https://socket.io/docs/v4/server-options/#maxhttpbuffersize
  maxHttpBufferSize: 1e8, // 100 MB
});
