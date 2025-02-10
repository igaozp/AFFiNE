import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { EventBus, OnEvent } from './eventbus';

@Global()
@Module({
  imports: [EventEmitterModule.forRoot({ global: false })],
  providers: [EventBus],
  exports: [EventBus],
})
export class EventModule {}

export { EventBus, OnEvent };
