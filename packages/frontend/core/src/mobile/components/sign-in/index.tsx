import { SignInPanel } from '@affine/core/components/sign-in';
import type { AuthSessionStatus } from '@affine/core/modules/cloud/entities/session';
import { useCallback } from 'react';

import { MobileSignInLayout } from './layout';

export const MobileSignInPanel = ({
  onClose,
  server,
}: {
  onClose: () => void;
  server?: string;
}) => {
  const onAuthenticated = useCallback(
    (status: AuthSessionStatus) => {
      if (status === 'authenticated') {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <MobileSignInLayout>
      <SignInPanel
        onSkip={onClose}
        onAuthenticated={onAuthenticated}
        server={server}
      />
    </MobileSignInLayout>
  );
};
