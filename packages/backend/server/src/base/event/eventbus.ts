import {
  applyDecorators,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import {
  EventEmitter2,
  EventEmitterReadinessWatcher,
  OnEvent as RawOnEvent,
  OnEventMetadata,
} from '@nestjs/event-emitter';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { CLS_ID, ClsService } from 'nestjs-cls';
import type { Server, Socket } from 'socket.io';

import { CallMetric } from '../metrics';
import { genRequestId } from '../utils';
import type { EventName } from './def';

const EventHandlerWrapper = (event: EventName): MethodDecorator => {
  // @ts-expect-error allow
  return (
    _target,
    key,
    desc: TypedPropertyDescriptor<(...args: any[]) => any>
  ) => {
    const originalMethod = desc.value;
    if (!originalMethod) {
      return desc;
    }

    desc.value = function (...args: any[]) {
      new Logger(EventBus.name).log(
        `Event handler: ${event} (${key.toString()})`
      );
      return originalMethod.apply(this, args);
    };
  };
};

export const OnEvent = (
  event: EventName,
  opts?: OnEventMetadata['options']
) => {
  const namespace = event.split('.')[0];

  return applyDecorators(
    EventHandlerWrapper(event),
    CallMetric('event', 'event_handler', undefined, { event, namespace }),
    RawOnEvent(event, opts)
  );
};

/**
 * We use socket.io system to auto pub/sub on server to server broadcast events
 */
@WebSocketGateway({
  namespace: 's2s',
})
@Injectable()
export class EventBus implements OnGatewayConnection, OnApplicationBootstrap {
  private readonly logger = new Logger(EventBus.name);

  @WebSocketServer()
  private readonly server?: Server;

  constructor(
    private readonly emitter: EventEmitter2,
    private readonly watcher: EventEmitterReadinessWatcher,
    private readonly cls: ClsService
  ) {}

  handleConnection(client: Socket) {
    // for internal usage only, disallow any connection from client
    this.logger.warn(
      `EventBus get suspicious connection from client ${client.id}, disconnecting...`
    );
    client.disconnect();
  }

  async onApplicationBootstrap() {
    this.watcher
      .waitUntilReady()
      .then(() => {
        const events = this.emitter.eventNames() as EventName[];
        events.forEach(event => {
          // Proxy all events received from server(trigger by `server.serverSideEmit`)
          // to internal event system
          this.server?.on(event, (payload, requestId?: string) => {
            this.cls.run(() => {
              requestId = requestId ?? genRequestId('se');
              this.cls.set(CLS_ID, requestId);
              this.logger.log(`Server Event: ${event} (Received)`);
              this.emit(event, payload);
            });
          });
        });
      })
      .catch(() => {
        // startup time promise, never throw at runtime
      });
  }

  /**
   * Emit event to trigger all listeners on current instance
   */
  async emitAsync<T extends EventName>(event: T, payload: Events[T]) {
    this.logger.log(`Dispatch event: ${event} (async)`);
    return await this.emitter.emitAsync(event, payload);
  }

  /**
   * Emit event to trigger all listeners on current instance
   */
  emit<T extends EventName>(event: T, payload: Events[T]) {
    this.logger.log(`Dispatch event: ${event}`);
    return this.emitter.emit(event, payload);
  }

  /**
   * Broadcast event to trigger all listeners on all instance in cluster
   */
  broadcast<T extends EventName>(event: T, payload: Events[T]) {
    this.logger.log(`Server Event: ${event} (Send)`);
    this.server?.serverSideEmit(event, payload, this.cls.getId());
  }

  on<T extends EventName>(
    event: T,
    listener: (payload: Events[T]) => void | Promise<any>,
    opts?: OnEventMetadata['options']
  ) {
    this.emitter.on(event, listener as any, opts);

    return () => {
      this.emitter.off(event, listener as any);
    };
  }

  waitFor<T extends EventName>(name: T, timeout?: number) {
    return this.emitter.waitFor(name, timeout);
  }
}
