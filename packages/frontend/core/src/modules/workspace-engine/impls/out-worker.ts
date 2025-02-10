import { OpClient } from '@toeverything/infra/op';

import type { WorkerOps } from './worker-ops';

let worker: OpClient<WorkerOps> | undefined;

export function getWorkspaceProfileWorker() {
  if (worker) {
    return worker;
  }

  const rawWorker = new Worker(
    new URL(
      /* webpackChunkName: "workspace-profile-worker" */ './in-worker.ts',
      import.meta.url
    )
  );

  worker = new OpClient<WorkerOps>(rawWorker);
  return worker;
}
