import { Skeleton } from '@affine/component';
import {
  ExplorerService,
  ExplorerTreeRoot,
} from '@affine/core/modules/explorer';
import { OrganizeService } from '@affine/core/modules/organize';
import { useI18n } from '@affine/i18n';
import track from '@affine/track';
import { AddOrganizeIcon } from '@blocksuite/icons/rc';
import { useLiveData, useServices } from '@toeverything/infra';
import { useCallback, useState } from 'react';

import { AddItemPlaceholder } from '../../layouts/add-item-placeholder';
import { CollapsibleSection } from '../../layouts/collapsible-section';
import { ExplorerFolderNode } from '../../nodes/folder';
import { FolderCreateTip, FolderRenameDialog } from '../../nodes/folder/dialog';

export const ExplorerOrganize = () => {
  const { organizeService, explorerService } = useServices({
    OrganizeService,
    ExplorerService,
  });
  const explorerSection = explorerService.sections.organize;
  const [openNewFolderDialog, setOpenNewFolderDialog] = useState(false);

  const t = useI18n();

  const folderTree = organizeService.folderTree;
  const rootFolder = folderTree.rootFolder;

  const folders = useLiveData(rootFolder.sortedChildren$);
  const isLoading = useLiveData(folderTree.isLoading$);

  const handleCreateFolder = useCallback(
    (name: string) => {
      const newFolderId = rootFolder.createFolder(
        name,
        rootFolder.indexAt('before')
      );
      track.$.navigationPanel.organize.createOrganizeItem({ type: 'folder' });
      explorerSection.setCollapsed(false);
      return newFolderId;
    },
    [explorerSection, rootFolder]
  );

  return (
    <CollapsibleSection
      name="organize"
      title={t['com.affine.rootAppSidebar.organize']()}
    >
      {/* TODO(@CatsJuice): Organize loading UI */}
      <ExplorerTreeRoot placeholder={isLoading ? <Skeleton /> : null}>
        {folders.map(child => (
          <ExplorerFolderNode key={child.id} nodeId={child.id as string} />
        ))}
        <AddItemPlaceholder
          icon={<AddOrganizeIcon />}
          data-testid="explorer-bar-add-organize-button"
          label={t['com.affine.rootAppSidebar.organize.add-folder']()}
          onClick={() => setOpenNewFolderDialog(true)}
        />
      </ExplorerTreeRoot>
      <FolderRenameDialog
        open={openNewFolderDialog}
        onConfirm={handleCreateFolder}
        onOpenChange={setOpenNewFolderDialog}
        descRenderer={FolderCreateTip}
      />
    </CollapsibleSection>
  );
};
