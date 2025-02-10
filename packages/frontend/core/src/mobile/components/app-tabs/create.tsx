import { usePageHelper } from '@affine/core/components/blocksuite/block-suite-page-list/utils';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { DocsService } from '@affine/core/modules/doc';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { TemplateDocService } from '@affine/core/modules/template-doc';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { WorkspaceService } from '@affine/core/modules/workspace';
import track from '@affine/track';
import { EditIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';

import type { AppTabCustomFCProps } from './data';
import { TabItem } from './tab-item';

export const AppTabCreate = ({ tab }: AppTabCustomFCProps) => {
  const workbench = useService(WorkbenchService).workbench;
  const workspaceService = useService(WorkspaceService);
  const featureFlagService = useService(FeatureFlagService);
  const templateDocService = useService(TemplateDocService);
  const docsService = useService(DocsService);

  const currentWorkspace = workspaceService.workspace;
  const pageHelper = usePageHelper(currentWorkspace.docCollection);
  const enableTemplateDoc = useLiveData(
    featureFlagService.flags.enable_template_doc.$
  );
  const enablePageTemplate = useLiveData(
    templateDocService.setting.enablePageTemplate$
  );
  const pageTemplateDocId = useLiveData(
    templateDocService.setting.pageTemplateDocId$
  );

  const createPage = useAsyncCallback(
    async (isActive: boolean) => {
      if (isActive) return;
      if (enableTemplateDoc && enablePageTemplate && pageTemplateDocId) {
        const docId =
          await docsService.duplicateFromTemplate(pageTemplateDocId);
        workbench.openDoc({ docId, fromTab: 'true' });
      } else {
        const doc = pageHelper.createPage(undefined, { show: false });
        workbench.openDoc({ docId: doc.id, fromTab: 'true' });
      }
      track.$.navigationPanel.$.createDoc();
    },
    [
      docsService,
      enablePageTemplate,
      enableTemplateDoc,
      pageHelper,
      pageTemplateDocId,
      workbench,
    ]
  );

  return (
    <TabItem id={tab.key} onClick={createPage} label="New Page">
      <EditIcon />
    </TabItem>
  );
};
