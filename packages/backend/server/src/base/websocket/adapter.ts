import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server } from 'socket.io';

import { Config } from '../config';
import { AuthenticationRequired } from '../error';
import { SocketIoRedis } from '../redis';
import { WEBSOCKET_OPTIONS } from './options';

export class SocketIoAdapter extends IoAdapter {
  constructor(private readonly app: INestApplication) {
    super(app);
  }

  override createIOServer(port: number, options?: any): Server {
    const config = this.app.get(WEBSOCKET_OPTIONS) as Config['websocket'];
    const server: Server = super.createIOServer(port, {
      ...config,
      ...options,
    });

    if (config.canActivate) {
      server.use((socket, next) => {
        // @ts-expect-error checked
        config
          .canActivate(socket)
          .then(pass => {
            if (pass) {
              next();
            } else {
              throw new AuthenticationRequired();
            }
          })
          .catch(e => {
            next(e);
          });
      });
    }

    const pubClient = this.app.get(SocketIoRedis);

    pubClient.on('error', err => {
      console.error(err);
    });

    const subClient = pubClient.duplicate();
    subClient.on('error', err => {
      console.error(err);
    });

    server.adapter(createAdapter(pubClient, subClient));

    return server;
  }
}
