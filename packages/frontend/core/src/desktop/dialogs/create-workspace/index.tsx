import { Avatar, ConfirmModal, Input, notify, Switch } from '@affine/component';
import type { ConfirmModalProps } from '@affine/component/ui/modal';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { AuthService, ServersService } from '@affine/core/modules/cloud';
import {
  type DialogComponentProps,
  type GLOBAL_DIALOG_SCHEMA,
  GlobalDialogService,
} from '@affine/core/modules/dialogs';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { CloudSvg } from '@affine/core/modules/share-menu';
import { WorkspacesService } from '@affine/core/modules/workspace';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import { FrameworkScope, useLiveData, useService } from '@toeverything/infra';
import { useCallback, useState } from 'react';

import { buildShowcaseWorkspace } from '../../../utils/first-app-data';
import * as styles from './dialog.css';

interface NameWorkspaceContentProps extends ConfirmModalProps {
  loading: boolean;
  forcedCloud?: boolean;
  serverId?: string;
  onConfirmName: (
    name: string,
    workspaceFlavour: string,
    avatar?: File
  ) => void;
}

const NameWorkspaceContent = ({
  loading,
  onConfirmName,
  forcedCloud,
  serverId,
  ...props
}: NameWorkspaceContentProps) => {
  const t = useI18n();
  const [workspaceName, setWorkspaceName] = useState('');

  const [enable, setEnable] = useState(!!forcedCloud);
  const session = useService(AuthService).session;
  const loginStatus = useLiveData(session.status$);

  const globalDialogService = useService(GlobalDialogService);

  const openSignInModal = useCallback(() => {
    globalDialogService.open('sign-in', {});
  }, [globalDialogService]);

  const onSwitchChange = useCallback(
    (checked: boolean) => {
      if (loginStatus !== 'authenticated') {
        return openSignInModal();
      }
      return setEnable(checked);
    },
    [loginStatus, openSignInModal]
  );

  const handleCreateWorkspace = useCallback(() => {
    if (loginStatus !== 'authenticated' && enable) {
      return openSignInModal();
    }
    onConfirmName(workspaceName, enable ? serverId || 'affine-cloud' : 'local');
  }, [
    enable,
    loginStatus,
    onConfirmName,
    openSignInModal,
    serverId,
    workspaceName,
  ]);

  const onEnter = useCallback(() => {
    if (workspaceName) {
      handleCreateWorkspace();
    }
  }, [handleCreateWorkspace, workspaceName]);

  // Currently, when we create a new workspace and upload an avatar at the same time,
  // an error occurs after the creation is successful: get blob 404 not found
  return (
    <ConfirmModal
      defaultOpen={true}
      title={t['com.affine.nameWorkspace.title']()}
      description={t['com.affine.nameWorkspace.description']()}
      cancelText={t['com.affine.nameWorkspace.button.cancel']()}
      confirmText={t['com.affine.nameWorkspace.button.create']()}
      confirmButtonOptions={{
        variant: 'primary',
        loading,
        disabled: !workspaceName,
        'data-testid': 'create-workspace-create-button',
      }}
      closeButtonOptions={{
        ['data-testid' as string]: 'create-workspace-close-button',
      }}
      onConfirm={handleCreateWorkspace}
      {...props}
    >
      <div className={styles.avatarWrapper}>
        <Avatar size={56} name={workspaceName} colorfulFallback />
      </div>

      <div className={styles.workspaceNameWrapper}>
        <div className={styles.subTitle}>
          {t['com.affine.nameWorkspace.subtitle.workspace-name']()}
        </div>
        <Input
          autoFocus
          data-testid="create-workspace-input"
          onEnter={onEnter}
          placeholder={t['com.affine.nameWorkspace.placeholder']()}
          maxLength={64}
          minLength={0}
          onChange={setWorkspaceName}
          size="large"
        />
      </div>
      {!serverId || serverId === 'affine-cloud' ? (
        <div className={styles.affineCloudWrapper}>
          <div className={styles.subTitle}>{t['AFFiNE Cloud']()}</div>
          <div className={styles.card}>
            <div className={styles.cardText}>
              <div className={styles.cardTitle}>
                <span>
                  {t['com.affine.nameWorkspace.affine-cloud.title']()}
                </span>
                <Switch
                  checked={enable}
                  onChange={onSwitchChange}
                  disabled={forcedCloud}
                />
              </div>
              <div className={styles.cardDescription}>
                {t['com.affine.nameWorkspace.affine-cloud.description']()}
              </div>
            </div>
            <div className={styles.cloudSvgContainer}>
              <CloudSvg />
            </div>
          </div>
          {forcedCloud && BUILD_CONFIG.isWeb ? (
            <a
              className={styles.cloudTips}
              href={BUILD_CONFIG.downloadUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t['com.affine.nameWorkspace.affine-cloud.web-tips']()}
            </a>
          ) : null}
        </div>
      ) : null}
    </ConfirmModal>
  );
};

export const CreateWorkspaceDialog = ({
  forcedCloud,
  serverId,
  close,
}: DialogComponentProps<GLOBAL_DIALOG_SCHEMA['create-workspace']>) => {
  const workspacesService = useService(WorkspacesService);
  const serversService = useService(ServersService);
  const featureFlagService = useService(FeatureFlagService);
  const enableLocalWorkspace = useLiveData(
    featureFlagService.flags.enable_local_workspace.$
  );
  const server = useLiveData(
    serverId ? serversService.server$(serverId) : null
  );
  const [loading, setLoading] = useState(false);

  const onConfirmName = useAsyncCallback(
    async (name: string, workspaceFlavour: string) => {
      track.$.$.$.createWorkspace({ flavour: workspaceFlavour });
      if (loading) return;
      setLoading(true);

      // this will be the last step for web for now
      // fix me later
      try {
        const { meta, defaultDocId } = await buildShowcaseWorkspace(
          workspacesService,
          workspaceFlavour,
          name
        );
        close({ metadata: meta, defaultDocId });
      } catch (e) {
        console.error(e);
        notify.error({
          title: 'Failed to create workspace',
          message: 'please try again later.',
        });
      } finally {
        setLoading(false);
      }
    },
    [loading, workspacesService, close]
  );

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        close();
      }
    },
    [close]
  );

  return (
    <FrameworkScope scope={server?.scope}>
      <NameWorkspaceContent
        loading={loading}
        serverId={serverId}
        open
        forcedCloud={forcedCloud || !enableLocalWorkspace}
        onOpenChange={onOpenChange}
        onConfirmName={onConfirmName}
      />
    </FrameworkScope>
  );
};
