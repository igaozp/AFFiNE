import '@affine/core/bootstrap/browser';

import { broadcastChannelStorages } from '@affine/nbstore/broadcast-channel';
import { cloudStorages } from '@affine/nbstore/cloud';
import { idbStorages } from '@affine/nbstore/idb';
import {
  StoreManagerConsumer,
  type WorkerManagerOps,
} from '@affine/nbstore/worker/consumer';
import { type MessageCommunicapable, OpConsumer } from '@toeverything/infra/op';

const consumer = new StoreManagerConsumer([
  ...idbStorages,
  ...broadcastChannelStorages,
  ...cloudStorages,
]);

const opConsumer = new OpConsumer<WorkerManagerOps>(
  globalThis as MessageCommunicapable
);

consumer.bindConsumer(opConsumer);
