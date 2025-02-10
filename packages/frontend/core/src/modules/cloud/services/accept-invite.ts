import type { GetInviteInfoQuery } from '@affine/graphql';
import {
  backoffRetry,
  catchErrorInto,
  effect,
  fromPromise,
  LiveData,
  onComplete,
  onStart,
  Service,
} from '@toeverything/infra';
import { EMPTY, exhaustMap, mergeMap } from 'rxjs';

import { isBackendError, isNetworkError } from '../error';
import type { AcceptInviteStore } from '../stores/accept-invite';
import type { InviteInfoStore } from '../stores/invite-info';

export type InviteInfo = GetInviteInfoQuery['getInviteInfo'];

export class AcceptInviteService extends Service {
  constructor(
    private readonly store: AcceptInviteStore,
    private readonly inviteInfoStore: InviteInfoStore
  ) {
    super();
  }
  inviteInfo$ = new LiveData<InviteInfo | undefined>(undefined);
  accepted$ = new LiveData<boolean>(false);
  loading$ = new LiveData(false);
  error$ = new LiveData<any>(null);

  readonly revalidate = effect(
    exhaustMap(({ inviteId }: { inviteId: string }) => {
      if (!inviteId) {
        return EMPTY;
      }
      return fromPromise(async () => {
        return await this.inviteInfoStore.getInviteInfo(inviteId);
      }).pipe(
        mergeMap(res => {
          this.inviteInfo$.setValue(res);
          return fromPromise(async () => {
            return await this.store.acceptInvite(
              res.workspace.id,
              inviteId,
              true
            );
          });
        }),
        mergeMap(res => {
          this.accepted$.next(res);
          return EMPTY;
        }),
        backoffRetry({
          when: isNetworkError,
          count: Infinity,
        }),
        backoffRetry({
          when: isBackendError,
          count: 3,
        }),
        catchErrorInto(this.error$),
        onStart(() => {
          this.loading$.setValue(true);
          this.inviteInfo$.setValue(undefined);
          this.accepted$.setValue(false);
        }),
        onComplete(() => {
          this.loading$.setValue(false);
        })
      );
    })
  );

  override dispose(): void {
    this.revalidate.unsubscribe();
  }
}
