import '@affine/core/bootstrap/browser';

import { broadcastChannelStorages } from '@affine/nbstore/broadcast-channel';
import { cloudStorages } from '@affine/nbstore/cloud';
import { idbStorages } from '@affine/nbstore/idb';
import { idbV1Storages } from '@affine/nbstore/idb/v1';
import {
  WorkerConsumer,
  type WorkerOps,
} from '@affine/nbstore/worker/consumer';
import { type MessageCommunicapable, OpConsumer } from '@toeverything/infra/op';

const consumer = new WorkerConsumer([
  ...idbStorages,
  ...idbV1Storages,
  ...broadcastChannelStorages,
  ...cloudStorages,
]);

if ('onconnect' in globalThis) {
  // if in shared worker
  let activeConnectionCount = 0;

  (globalThis as any).onconnect = (event: MessageEvent) => {
    activeConnectionCount++;
    const port = event.ports[0];
    port.addEventListener('message', (event: MessageEvent) => {
      if (event.data.type === '__close__') {
        activeConnectionCount--;
        if (activeConnectionCount === 0) {
          globalThis.close();
        }
      }
    });

    const opConsumer = new OpConsumer<WorkerOps>(port);
    consumer.bindConsumer(opConsumer);
  };
} else {
  // if in worker
  const opConsumer = new OpConsumer<WorkerOps>(
    globalThis as MessageCommunicapable
  );

  consumer.bindConsumer(opConsumer);
}
