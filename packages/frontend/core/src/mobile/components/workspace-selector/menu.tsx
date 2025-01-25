import { IconButton } from '@affine/component';
import { useNavigateHelper } from '@affine/core/components/hooks/use-navigate-helper';
import { useWorkspaceInfo } from '@affine/core/components/hooks/use-workspace-info';
import { WorkspaceAvatar } from '@affine/core/components/workspace-avatar';
import {
  type WorkspaceMetadata,
  WorkspaceService,
  WorkspacesService,
} from '@affine/core/modules/workspace';
import { CloseIcon, CollaborationIcon } from '@blocksuite/icons/rc';
import {
  useLiveData,
  useService,
  useServiceOptional,
} from '@toeverything/infra';
import clsx from 'clsx';
import { type HTMLAttributes, useCallback, useMemo } from 'react';

import * as styles from './menu.css';

const filterByFlavour = (workspaces: WorkspaceMetadata[], flavour: string) =>
  workspaces.filter(ws => flavour === ws.flavour);

const WorkspaceItem = ({
  workspace,
  className,
  ...attrs
}: { workspace: WorkspaceMetadata } & HTMLAttributes<HTMLButtonElement>) => {
  const info = useWorkspaceInfo(workspace);
  const name = info?.name;
  const isOwner = info?.isOwner;

  return (
    <li className={styles.wsItem}>
      <button className={clsx(styles.wsCard, className)} {...attrs}>
        <WorkspaceAvatar
          key={workspace.id}
          meta={workspace}
          rounded={6}
          data-testid="workspace-avatar"
          size={32}
          name={name}
          colorfulFallback
        />
        <div className={styles.wsName}>{name}</div>
        {!isOwner ? <CollaborationIcon fontSize={24} /> : null}
      </button>
    </li>
  );
};

const WorkspaceList = ({
  list,
  title,
  onClose,
}: {
  title: string;
  list: WorkspaceMetadata[];
  onClose?: () => void;
}) => {
  const currentWorkspace = useServiceOptional(WorkspaceService)?.workspace;

  const { jumpToPage } = useNavigateHelper();
  const toggleWorkspace = useCallback(
    (id: string) => {
      if (id !== currentWorkspace?.id) {
        jumpToPage(id, 'home');
      }
      onClose?.();
    },
    [currentWorkspace?.id, jumpToPage, onClose]
  );

  if (!list.length) return null;

  return (
    <>
      <section className={styles.wsListTitle}>{title}</section>
      <ul className={styles.wsList}>
        {list.map(ws => (
          <WorkspaceItem
            key={ws.id}
            workspace={ws}
            onClick={() => toggleWorkspace?.(ws.id)}
          />
        ))}
      </ul>
    </>
  );
};

export const SelectorMenu = ({ onClose }: { onClose?: () => void }) => {
  const workspacesService = useService(WorkspacesService);
  const workspaces = useLiveData(workspacesService.list.workspaces$);

  // TODO: support selfhosted
  const cloudWorkspaces = useMemo(
    () => filterByFlavour(workspaces, 'affine-cloud'),
    [workspaces]
  );

  const localWorkspaces = useMemo(
    () => filterByFlavour(workspaces, 'local'),
    [workspaces]
  );

  return (
    <div className={styles.root}>
      <header className={styles.head}>
        Workspace
        <IconButton onClick={onClose} size="24" icon={<CloseIcon />} />
      </header>
      <div className={styles.divider} />
      <main className={styles.body}>
        <WorkspaceList
          onClose={onClose}
          title="Cloud Sync"
          list={cloudWorkspaces}
        />
        {cloudWorkspaces.length && localWorkspaces.length ? (
          <div className={styles.divider} />
        ) : null}
        <WorkspaceList
          onClose={onClose}
          title="Local Storage"
          list={localWorkspaces}
        />
      </main>
    </div>
  );
};
