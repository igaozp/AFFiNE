import {
  SettingHeader,
  SettingRow,
  SettingWrapper,
} from '@affine/component/setting-components';
import { useWorkspaceInfo } from '@affine/core/components/hooks/use-workspace-info';
import { WorkspaceServerService } from '@affine/core/modules/cloud';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { UNTITLED_WORKSPACE_NAME } from '@affine/env/constant';
import { useI18n } from '@affine/i18n';
import { FrameworkScope, useService } from '@toeverything/infra';

import { DeleteLeaveWorkspace } from './delete-leave-workspace';
import { EnableCloudPanel } from './enable-cloud';
import { LabelsPanel } from './labels';
import { ProfilePanel } from './profile';
import { SharingPanel } from './sharing';
import { TemplateDocSetting } from './template';
import type { WorkspaceSettingDetailProps } from './types';

export const WorkspaceSettingDetail = ({
  onCloseSetting,
}: WorkspaceSettingDetailProps) => {
  const t = useI18n();

  const workspace = useService(WorkspaceService).workspace;
  const server = workspace?.scope.get(WorkspaceServerService).server;

  const workspaceInfo = useWorkspaceInfo(workspace);

  return (
    <FrameworkScope scope={server?.scope}>
      <SettingHeader
        title={t[`Workspace Settings with name`]({
          name: workspaceInfo?.name ?? UNTITLED_WORKSPACE_NAME,
        })}
        subtitle={t['com.affine.settings.workspace.description']()}
      />
      <SettingWrapper title={t['Info']()}>
        <SettingRow
          name={t['Workspace Profile']()}
          desc={t['com.affine.settings.workspace.not-owner']()}
          spreadCol={false}
        >
          <ProfilePanel />
          <LabelsPanel />
          {workspace.flavour === 'local' && (
            <EnableCloudPanel onCloseSetting={onCloseSetting} />
          )}
        </SettingRow>
      </SettingWrapper>
      <TemplateDocSetting />
      <SharingPanel />
      <SettingWrapper>
        <DeleteLeaveWorkspace onCloseSetting={onCloseSetting} />
      </SettingWrapper>
    </FrameworkScope>
  );
};
