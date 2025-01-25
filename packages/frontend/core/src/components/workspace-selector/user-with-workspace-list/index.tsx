import { MenuItem } from '@affine/component/ui/menu';
import { AuthService } from '@affine/core/modules/cloud';
import { GlobalDialogService } from '@affine/core/modules/dialogs';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { type WorkspaceMetadata } from '@affine/core/modules/workspace';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import { Logo1Icon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback } from 'react';

import { AddServer } from './add-server';
import { AddWorkspace } from './add-workspace';
import * as styles from './index.css';
import { AFFiNEWorkspaceList } from './workspace-list';

export const SignInItem = () => {
  const globalDialogService = useService(GlobalDialogService);

  const t = useI18n();

  const onClickSignIn = useCallback(() => {
    track.$.navigationPanel.workspaceList.requestSignIn();
    globalDialogService.open('sign-in', {});
  }, [globalDialogService]);

  return (
    <MenuItem
      className={styles.menuItem}
      onClick={onClickSignIn}
      data-testid="cloud-signin-button"
    >
      <div className={styles.signInWrapper}>
        <div className={styles.iconContainer}>
          <Logo1Icon />
        </div>

        <div className={styles.signInTextContainer}>
          <div className={styles.signInTextPrimary}>
            {t['com.affine.workspace.cloud.auth']()}
          </div>
          <div className={styles.signInTextSecondary}>
            {t['com.affine.workspace.cloud.description']()}
          </div>
        </div>
      </div>
    </MenuItem>
  );
};

interface UserWithWorkspaceListProps {
  onEventEnd?: () => void;
  onClickWorkspace?: (workspace: WorkspaceMetadata) => void;
  onCreatedWorkspace?: (payload: {
    metadata: WorkspaceMetadata;
    defaultDocId?: string;
  }) => void;
  showEnableCloudButton?: boolean;
}

const UserWithWorkspaceListInner = ({
  onEventEnd,
  onClickWorkspace,
  onCreatedWorkspace,
  showEnableCloudButton,
}: UserWithWorkspaceListProps) => {
  const globalDialogService = useService(GlobalDialogService);
  const session = useLiveData(useService(AuthService).session.session$);
  const featureFlagService = useService(FeatureFlagService);

  const isAuthenticated = session.status === 'authenticated';

  const openSignInModal = useCallback(() => {
    globalDialogService.open('sign-in', {});
  }, [globalDialogService]);

  const onNewWorkspace = useCallback(() => {
    if (
      !isAuthenticated &&
      !featureFlagService.flags.enable_local_workspace.value
    ) {
      return openSignInModal();
    }
    track.$.navigationPanel.workspaceList.createWorkspace();
    globalDialogService.open('create-workspace', {}, payload => {
      if (payload) {
        onCreatedWorkspace?.(payload);
      }
    });
    onEventEnd?.();
  }, [
    globalDialogService,
    featureFlagService,
    isAuthenticated,
    onCreatedWorkspace,
    onEventEnd,
    openSignInModal,
  ]);

  const onAddWorkspace = useCallback(() => {
    track.$.navigationPanel.workspaceList.createWorkspace({
      control: 'import',
    });
    globalDialogService.open('import-workspace', undefined, payload => {
      if (payload) {
        onCreatedWorkspace?.({ metadata: payload.workspace });
      }
    });
    onEventEnd?.();
  }, [globalDialogService, onCreatedWorkspace, onEventEnd]);

  const onAddServer = useCallback(() => {
    globalDialogService.open('sign-in', { step: 'addSelfhosted' });
  }, [globalDialogService]);

  return (
    <div className={styles.workspaceListWrapper}>
      <AFFiNEWorkspaceList
        onEventEnd={onEventEnd}
        onClickWorkspace={onClickWorkspace}
        showEnableCloudButton={showEnableCloudButton}
      />
      <AddWorkspace
        onAddWorkspace={onAddWorkspace}
        onNewWorkspace={onNewWorkspace}
      />
      <AddServer onAddServer={onAddServer} />
    </div>
  );
};

export const UserWithWorkspaceList = (props: UserWithWorkspaceListProps) => {
  return <UserWithWorkspaceListInner {...props} />;
};
