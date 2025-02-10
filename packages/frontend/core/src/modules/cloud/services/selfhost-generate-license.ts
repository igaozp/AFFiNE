import { UserFriendlyError } from '@affine/graphql';
import {
  backoffRetry,
  effect,
  fromPromise,
  LiveData,
  onComplete,
  onStart,
  Service,
} from '@toeverything/infra';
import { catchError, EMPTY, exhaustMap, mergeMap } from 'rxjs';

import { isBackendError, isNetworkError } from '../error';
import type { SelfhostGenerateLicenseStore } from '../stores/selfhost-generate-license';

export class SelfhostGenerateLicenseService extends Service {
  constructor(private readonly store: SelfhostGenerateLicenseStore) {
    super();
  }
  licenseKey$ = new LiveData<string | null>(null);
  isLoading$ = new LiveData(false);
  error$ = new LiveData<UserFriendlyError | null>(null);

  generateLicenseKey = effect(
    exhaustMap((sessionId: string) => {
      return fromPromise(async () => {
        return await this.store.generateKey(sessionId);
      }).pipe(
        backoffRetry({
          when: isNetworkError,
          count: Infinity,
        }),
        backoffRetry({
          when: isBackendError,
        }),
        mergeMap(key => {
          this.licenseKey$.next(key);
          return EMPTY;
        }),
        catchError(err => {
          this.error$.next(UserFriendlyError.fromAnyError(err));
          console.error(err);
          return EMPTY;
        }),
        onStart(() => {
          this.isLoading$.next(true);
        }),
        onComplete(() => {
          this.isLoading$.next(false);
        })
      );
    })
  );
}
