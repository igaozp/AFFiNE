import { DebugLogger } from '@affine/debug';
import {
  backoffRetry,
  catchErrorInto,
  effect,
  Entity,
  fromPromise,
  LiveData,
  onComplete,
  onStart,
} from '@toeverything/infra';
import { EMPTY, exhaustMap, mergeMap } from 'rxjs';

import { isBackendError, isNetworkError } from '../../cloud';
import type { WorkspaceService } from '../../workspace';
import type { WorkspacePermissionStore } from '../stores/permission';

const logger = new DebugLogger('affine:workspace-permission');

export class WorkspacePermission extends Entity {
  isOwner$ = new LiveData<boolean | null>(null);
  isAdmin$ = new LiveData<boolean | null>(null);
  isTeam$ = new LiveData<boolean | null>(null);
  isLoading$ = new LiveData(false);
  error$ = new LiveData<any>(null);

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly store: WorkspacePermissionStore
  ) {
    super();
  }

  revalidate = effect(
    exhaustMap(() => {
      return fromPromise(async signal => {
        if (this.workspaceService.workspace.flavour !== 'local') {
          const info = await this.store.fetchWorkspaceInfo(
            this.workspaceService.workspace.id,
            signal
          );

          return {
            isOwner: info.isOwner,
            isAdmin: info.isAdmin,
            isTeam: info.workspace.team,
          };
        } else {
          return { isOwner: true, isAdmin: false, isTeam: false };
        }
      }).pipe(
        backoffRetry({
          when: isNetworkError,
          count: Infinity,
        }),
        backoffRetry({
          when: isBackendError,
        }),
        mergeMap(({ isOwner, isAdmin, isTeam }) => {
          this.isAdmin$.next(isAdmin);
          this.isOwner$.next(isOwner);
          this.isTeam$.next(isTeam);
          return EMPTY;
        }),
        catchErrorInto(this.error$, error => {
          logger.error('Failed to fetch isOwner', error);
        }),
        onStart(() => this.isLoading$.setValue(true)),
        onComplete(() => this.isLoading$.setValue(false))
      );
    })
  );

  override dispose(): void {
    this.revalidate.unsubscribe();
  }
}
