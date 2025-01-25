import './setup';

import { broadcastChannelStorages } from '@affine/nbstore/broadcast-channel';
import { cloudStorages } from '@affine/nbstore/cloud';
import {
  bindNativeDBApis,
  type NativeDBApis,
  sqliteStorages,
} from '@affine/nbstore/sqlite';
import {
  WorkerConsumer,
  type WorkerOps,
} from '@affine/nbstore/worker/consumer';
import { type MessageCommunicapable, OpConsumer } from '@toeverything/infra/op';
import { AsyncCall } from 'async-call-rpc';

globalThis.addEventListener('message', e => {
  if (e.data.type === 'native-db-api-channel') {
    const port = e.ports[0] as MessagePort;
    const rpc = AsyncCall<NativeDBApis>(
      {},
      {
        channel: {
          on(listener) {
            const f = (e: MessageEvent<any>) => {
              listener(e.data);
            };
            port.addEventListener('message', f);
            return () => {
              port.removeEventListener('message', f);
            };
          },
          send(data) {
            port.postMessage(data);
          },
        },
      }
    );
    bindNativeDBApis(rpc);
    port.start();
  }
});

const consumer = new OpConsumer<WorkerOps>(globalThis as MessageCommunicapable);

const worker = new WorkerConsumer([
  ...sqliteStorages,
  ...broadcastChannelStorages,
  ...cloudStorages,
]);

worker.bindConsumer(consumer);
