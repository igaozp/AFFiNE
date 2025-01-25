import { usePageHelper } from '@affine/core/components/blocksuite/block-suite-page-list/utils';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { WorkspaceService } from '@affine/core/modules/workspace';
import track from '@affine/track';
import { EditIcon } from '@blocksuite/icons/rc';
import { useService } from '@toeverything/infra';
import { useCallback } from 'react';

import type { AppTabCustomFCProps } from './data';
import { TabItem } from './tab-item';

export const AppTabCreate = ({ tab }: AppTabCustomFCProps) => {
  const workbench = useService(WorkbenchService).workbench;
  const workspaceService = useService(WorkspaceService);
  const currentWorkspace = workspaceService.workspace;
  const pageHelper = usePageHelper(currentWorkspace.docCollection);

  const createPage = useCallback(
    (isActive: boolean) => {
      if (isActive) return;
      const doc = pageHelper.createPage(undefined, { show: false });
      workbench.openDoc({ docId: doc.id, fromTab: 'true' });
      track.$.navigationPanel.$.createDoc();
    },
    [pageHelper, workbench]
  );

  return (
    <TabItem id={tab.key} onClick={createPage} label="New Page">
      <EditIcon />
    </TabItem>
  );
};
