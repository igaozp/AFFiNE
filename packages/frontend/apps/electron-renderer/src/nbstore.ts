import '@affine/core/bootstrap/electron';

import type { ClientHandler } from '@affine/electron-api';
import { broadcastChannelStorages } from '@affine/nbstore/broadcast-channel';
import { cloudStorages } from '@affine/nbstore/cloud';
import { bindNativeDBApis, sqliteStorages } from '@affine/nbstore/sqlite';
import {
  bindNativeDBV1Apis,
  sqliteV1Storages,
} from '@affine/nbstore/sqlite/v1';
import {
  WorkerConsumer,
  type WorkerOps,
} from '@affine/nbstore/worker/consumer';
import { OpConsumer } from '@toeverything/infra/op';
import { AsyncCall } from 'async-call-rpc';

const worker = new WorkerConsumer([
  ...sqliteStorages,
  ...sqliteV1Storages,
  ...broadcastChannelStorages,
  ...cloudStorages,
]);

let activeConnectionCount = 0;
let electronAPIsInitialized = false;

function connectElectronAPIs(port: MessagePort) {
  if (electronAPIsInitialized) {
    return;
  }
  electronAPIsInitialized = true;
  port.postMessage({ type: '__electron-apis-init__' });

  const { promise, resolve } = Promise.withResolvers<MessagePort>();
  port.addEventListener('message', event => {
    if (event.data.type === '__electron-apis__') {
      const [port] = event.ports;
      resolve(port);
    }
  });

  const rpc = AsyncCall<Record<string, any>>(null, {
    channel: promise.then(p => ({
      on(listener) {
        p.onmessage = e => {
          listener(e.data);
        };
        p.start();
        return () => {
          p.onmessage = null;
          try {
            p.close();
          } catch (err) {
            console.error('close port error', err);
          }
        };
      },
      send(data) {
        p.postMessage(data);
      },
    })),
    log: false,
  });

  const electronAPIs = new Proxy<ClientHandler>(rpc as any, {
    get(_, namespace: string) {
      return new Proxy(rpc as any, {
        get(_, method: string) {
          return rpc[`${namespace}:${method}`];
        },
      });
    },
  });

  bindNativeDBApis(electronAPIs.nbstore);
  bindNativeDBV1Apis(electronAPIs.db);
}

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

  connectElectronAPIs(port);

  const consumer = new OpConsumer<WorkerOps>(port);
  worker.bindConsumer(consumer);
};
