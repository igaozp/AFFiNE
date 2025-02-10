import { Injectable } from '@nestjs/common';

import { OnEvent } from '../../base';

declare global {
  interface Events {
    '__test__.event': { count: number; requestId?: string };
    '__test__.event2': { count: number };
    '__test__.throw': { count: number };
  }
}

@Injectable()
export class Listeners {
  @OnEvent('__test__.event')
  onTestEvent({ count, requestId }: Events['__test__.event']) {
    return requestId
      ? {
          count: count + 1,
          requestId,
        }
      : {
          count: count + 1,
        };
  }

  @OnEvent('__test__.throw')
  onThrow() {
    throw new Error('Error in event handler');
  }
}
