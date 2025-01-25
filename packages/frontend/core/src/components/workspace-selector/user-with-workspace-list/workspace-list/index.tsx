import {
  IconButton,
  Menu,
  MenuItem,
  ScrollableContainer,
} from '@affine/component';
import { Divider } from '@affine/component/ui/divider';
import { useEnableCloud } from '@affine/core/components/hooks/affine/use-enable-cloud';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { useNavigateHelper } from '@affine/core/components/hooks/use-navigate-helper';
import type { Server } from '@affine/core/modules/cloud';
import { AuthService, ServersService } from '@affine/core/modules/cloud';
import { GlobalDialogService } from '@affine/core/modules/dialogs';
import { GlobalContextService } from '@affine/core/modules/global-context';
import {
  type WorkspaceMetadata,
  WorkspaceService,
  WorkspacesService,
} from '@affine/core/modules/workspace';
import { ServerDeploymentType } from '@affine/graphql';
import { useI18n } from '@affine/i18n';
import {
  CloudWorkspaceIcon,
  LocalWorkspaceIcon,
  MoreHorizontalIcon,
  PlusIcon,
  TeamWorkspaceIcon,
} from '@blocksuite/icons/rc';
import {
  FrameworkScope,
  useLiveData,
  useService,
  useServiceOptional,
} from '@toeverything/infra';
import { useCallback, useMemo } from 'react';

import { WorkspaceCard } from '../../workspace-card';
import * as styles from './index.css';

interface WorkspaceModalProps {
  workspaces: WorkspaceMetadata[];
  onClickWorkspace: (workspaceMetadata: WorkspaceMetadata) => void;
  onClickWorkspaceSetting?: (workspaceMetadata: WorkspaceMetadata) => void;
  onClickEnableCloud?: (meta: WorkspaceMetadata) => void;
  onNewWorkspace: () => void;
  onAddWorkspace: () => void;
}

const CloudWorkSpaceList = ({
  server,
  workspaces,
  onClickWorkspace,
  onClickEnableCloud,
}: {
  server: Server;
  workspaces: WorkspaceMetadata[];
  onClickWorkspace: (workspaceMetadata: WorkspaceMetadata) => void;
  onClickEnableCloud?: (meta: WorkspaceMetadata) => void;
}) => {
  const t = useI18n();
  const globalContextService = useService(GlobalContextService);
  const globalDialogService = useService(GlobalDialogService);
  const serverName = useLiveData(server.config$.selector(c => c.serverName));
  const authService = useService(AuthService);
  const serversService = useService(ServersService);
  const account = useLiveData(authService.session.account$);
  const accountStatus = useLiveData(authService.session.status$);
  const navigateHelper = useNavigateHelper();

  const currentWorkspaceFlavour = useLiveData(
    globalContextService.globalContext.workspaceFlavour.$
  );

  const serverType = server.config$.value.type;

  const handleDeleteServer = useCallback(() => {
    serversService.removeServer(server.id);

    if (currentWorkspaceFlavour === server.id) {
      const otherWorkspace = workspaces.find(w => w.flavour !== server.id);
      if (otherWorkspace) {
        navigateHelper.openPage(otherWorkspace.id, 'all');
      }
    }
  }, [
    currentWorkspaceFlavour,
    navigateHelper,
    server.id,
    serversService,
    workspaces,
  ]);

  const handleSignOut = useAsyncCallback(async () => {
    await authService.signOut();
  }, [authService]);

  const handleSignIn = useAsyncCallback(async () => {
    globalDialogService.open('sign-in', {
      server: server.baseUrl,
    });
  }, [globalDialogService, server.baseUrl]);

  const onNewWorkspace = useCallback(() => {
    globalDialogService.open(
      'create-workspace',
      {
        serverId: server.id,
        forcedCloud: true,
      },
      payload => {
        if (payload) {
          navigateHelper.openPage(payload.metadata.id, 'all');
        }
      }
    );
  }, [globalDialogService, navigateHelper, server.id]);

  return (
    <div className={styles.workspaceListWrapper}>
      <div className={styles.workspaceServer}>
        <div className={styles.workspaceServerContent}>
          <div className={styles.workspaceServerName}>
            {serverType === ServerDeploymentType.Affine ? (
              <CloudWorkspaceIcon className={styles.workspaceTypeIcon} />
            ) : (
              <TeamWorkspaceIcon className={styles.workspaceTypeIcon} />
            )}
            <div className={styles.account}>{serverName}</div>
          </div>
          <div className={styles.account}>
            {account ? account.email : 'Not signed in'}
          </div>
        </div>

        <Menu
          items={[
            server.id !== 'affine-cloud' && (
              <MenuItem key="delete-server" onClick={handleDeleteServer}>
                {t['com.affine.server.delete']()}
              </MenuItem>
            ),
            accountStatus === 'authenticated' && (
              <MenuItem key="sign-out" onClick={handleSignOut}>
                {t['Sign out']()}
              </MenuItem>
            ),
            accountStatus === 'unauthenticated' && (
              <MenuItem key="sign-in" onClick={handleSignIn}>
                {t['Sign in']()}
              </MenuItem>
            ),
          ]}
        >
          <div>
            <IconButton icon={<MoreHorizontalIcon />} />
          </div>
        </Menu>
      </div>
      <WorkspaceList
        items={workspaces}
        onClick={onClickWorkspace}
        onEnableCloudClick={onClickEnableCloud}
      />
      <MenuItem
        block={true}
        prefixIcon={<PlusIcon />}
        onClick={onNewWorkspace}
        className={styles.ItemContainer}
      >
        <div className={styles.ItemText}>
          {t['com.affine.workspaceList.addWorkspace.create']()}
        </div>
      </MenuItem>
    </div>
  );
};

const LocalWorkspaces = ({
  workspaces,
  onClickWorkspace,
  onClickWorkspaceSetting,
  onClickEnableCloud,
}: Omit<WorkspaceModalProps, 'onNewWorkspace' | 'onAddWorkspace'>) => {
  const t = useI18n();
  if (workspaces.length === 0) {
    return null;
  }
  return (
    <div className={styles.workspaceListWrapper}>
      <div className={styles.workspaceServer}>
        <div className={styles.workspaceServerName}>
          <LocalWorkspaceIcon
            width={14}
            height={14}
            className={styles.workspaceTypeIcon}
          />
          {t['com.affine.workspaceList.workspaceListType.local']()}
        </div>
      </div>
      <WorkspaceList
        items={workspaces}
        onClick={onClickWorkspace}
        onSettingClick={onClickWorkspaceSetting}
        onEnableCloudClick={onClickEnableCloud}
      />
      <Divider size="thinner" />
    </div>
  );
};

export const AFFiNEWorkspaceList = ({
  onEventEnd,
  onClickWorkspace,
  showEnableCloudButton,
}: {
  onClickWorkspace?: (workspaceMetadata: WorkspaceMetadata) => void;
  onEventEnd?: () => void;
  showEnableCloudButton?: boolean;
}) => {
  const workspacesService = useService(WorkspacesService);
  const workspaces = useLiveData(workspacesService.list.workspaces$);

  const confirmEnableCloud = useEnableCloud();

  const serversService = useService(ServersService);
  const servers = useLiveData(serversService.servers$);

  const cloudWorkspaces = useMemo(
    () =>
      workspaces.filter(
        ({ flavour }) => flavour !== 'local'
      ) as WorkspaceMetadata[],
    [workspaces]
  );

  const localWorkspaces = useMemo(
    () =>
      workspaces.filter(
        ({ flavour }) => flavour === 'local'
      ) as WorkspaceMetadata[],
    [workspaces]
  );

  const onClickEnableCloud = useCallback(
    (meta: WorkspaceMetadata) => {
      const { workspace, dispose } = workspacesService.open({ metadata: meta });
      confirmEnableCloud(workspace, {
        onFinished: () => {
          dispose();
        },
      });
    },
    [confirmEnableCloud, workspacesService]
  );

  const handleClickWorkspace = useCallback(
    (workspaceMetadata: WorkspaceMetadata) => {
      onClickWorkspace?.(workspaceMetadata);
      onEventEnd?.();
    },
    [onClickWorkspace, onEventEnd]
  );

  return (
    <ScrollableContainer
      className={styles.workspaceListsWrapper}
      scrollBarClassName={styles.scrollbar}
    >
      <div>
        {servers.map(server => (
          <FrameworkScope key={server.id} scope={server.scope}>
            <CloudWorkSpaceList
              server={server}
              workspaces={cloudWorkspaces.filter(
                ({ flavour }) => flavour === server.id
              )}
              onClickWorkspace={handleClickWorkspace}
            />
            <Divider size="thinner" />
          </FrameworkScope>
        ))}
      </div>
      <LocalWorkspaces
        workspaces={localWorkspaces}
        onClickWorkspace={handleClickWorkspace}
        onClickEnableCloud={
          showEnableCloudButton ? onClickEnableCloud : undefined
        }
      />
    </ScrollableContainer>
  );
};

interface WorkspaceListProps {
  items: WorkspaceMetadata[];
  onClick: (workspace: WorkspaceMetadata) => void;
  onSettingClick?: (workspace: WorkspaceMetadata) => void;
  onEnableCloudClick?: (meta: WorkspaceMetadata) => void;
}

interface SortableWorkspaceItemProps extends Omit<WorkspaceListProps, 'items'> {
  workspaceMetadata: WorkspaceMetadata;
}

const SortableWorkspaceItem = ({
  workspaceMetadata,
  onClick,
  onSettingClick,
  onEnableCloudClick,
}: SortableWorkspaceItemProps) => {
  const handleClick = useCallback(() => {
    onClick(workspaceMetadata);
  }, [onClick, workspaceMetadata]);

  const currentWorkspace = useServiceOptional(WorkspaceService)?.workspace;

  return (
    <WorkspaceCard
      className={styles.workspaceCard}
      workspaceMetadata={workspaceMetadata}
      onClick={handleClick}
      avatarSize={28}
      active={currentWorkspace?.id === workspaceMetadata.id}
      onClickOpenSettings={onSettingClick}
      onClickEnableCloud={onEnableCloudClick}
    />
  );
};

export const WorkspaceList = (props: WorkspaceListProps) => {
  const workspaceList = props.items;

  return workspaceList.map(item => (
    <SortableWorkspaceItem key={item.id} {...props} workspaceMetadata={item} />
  ));
};
