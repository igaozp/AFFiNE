import {
  SettingHeader,
  SettingWrapper,
} from '@affine/component/setting-components';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { useI18n } from '@affine/i18n';
import { useService } from '@toeverything/infra';

import { EnableCloudPanel } from '../preference/enable-cloud';
import { BlobManagementPanel } from './blob-management';
import { DesktopExportPanel } from './export';
import { WorkspaceQuotaPanel } from './workspace-quota';

export const WorkspaceSettingStorage = ({
  onCloseSetting,
}: {
  onCloseSetting: () => void;
}) => {
  const t = useI18n();
  const workspace = useService(WorkspaceService).workspace;
  return (
    <>
      <SettingHeader
        title={t['Storage']()}
        subtitle={t['com.affine.settings.workspace.storage.subtitle']()}
      />
      {workspace.flavour === 'local' ? (
        <EnableCloudPanel onCloseSetting={onCloseSetting} />
      ) : (
        <>
          <SettingWrapper>
            <WorkspaceQuotaPanel />
          </SettingWrapper>

          <SettingWrapper>
            <BlobManagementPanel />
          </SettingWrapper>
        </>
      )}
      {BUILD_CONFIG.isElectron && (
        <SettingWrapper>
          <DesktopExportPanel workspace={workspace} />
        </SettingWrapper>
      )}
    </>
  );
};
