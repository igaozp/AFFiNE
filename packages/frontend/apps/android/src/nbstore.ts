import '@affine/core/bootstrap/browser';

import { broadcastChannelStorages } from '@affine/nbstore/broadcast-channel';
import { cloudStorages } from '@affine/nbstore/cloud';
import { idbStorages } from '@affine/nbstore/idb';
import {
  WorkerConsumer,
  type WorkerOps,
} from '@affine/nbstore/worker/consumer';
import { type MessageCommunicapable, OpConsumer } from '@toeverything/infra/op';

const consumer = new WorkerConsumer([
  ...idbStorages,
  ...broadcastChannelStorages,
  ...cloudStorages,
]);

const opConsumer = new OpConsumer<WorkerOps>(
  globalThis as MessageCommunicapable
);

consumer.bindConsumer(opConsumer);
