import type {
  StoreClient,
  WorkerInitOptions,
} from '@affine/nbstore/worker/client';
import { Entity } from '@toeverything/infra';

import type { NbstoreService } from '../../storage';
import { WorkspaceEngineBeforeStart } from '../events';
import type { WorkspaceService } from '../services/workspace';

export class WorkspaceEngine extends Entity<{
  isSharedMode?: boolean;
  engineWorkerInitOptions: WorkerInitOptions;
}> {
  client?: StoreClient;
  started = false;

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly nbstoreService: NbstoreService
  ) {
    super();
  }

  get doc() {
    if (!this.client) {
      throw new Error('Engine is not initialized');
    }
    return this.client.docFrontend;
  }

  get blob() {
    if (!this.client) {
      throw new Error('Engine is not initialized');
    }
    return this.client.blobFrontend;
  }

  get awareness() {
    if (!this.client) {
      throw new Error('Engine is not initialized');
    }
    return this.client.awarenessFrontend;
  }

  start() {
    if (this.started) {
      throw new Error('Engine is already started');
    }
    this.started = true;

    const { store, dispose } = this.nbstoreService.openStore(
      (this.props.isSharedMode ? 'shared:' : '') +
        `workspace:${this.workspaceService.workspace.flavour}:${this.workspaceService.workspace.id}`,
      this.props.engineWorkerInitOptions
    );
    this.client = store;
    this.disposables.push(dispose);
    this.eventBus.emit(WorkspaceEngineBeforeStart, this);

    const rootDoc = this.workspaceService.workspace.docCollection.doc;
    // priority load root doc
    this.doc.addPriority(rootDoc.guid, 100);
    this.doc.start();
    this.disposables.push(() => this.doc.stop());
  }
}
