import { notify } from '@affine/component';
import { SettingRow } from '@affine/component/setting-components';
import { Button } from '@affine/component/ui/button';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { useSystemOnline } from '@affine/core/components/hooks/use-system-online';
import { DesktopApiService } from '@affine/core/modules/desktop-api';
import { WorkspacePermissionService } from '@affine/core/modules/permissions';
import type { Workspace } from '@affine/core/modules/workspace';
import { useI18n } from '@affine/i18n';
import { universalId } from '@affine/nbstore';
import track from '@affine/track';
import { useLiveData, useService } from '@toeverything/infra';
import { useState } from 'react';

interface ExportPanelProps {
  workspace: Workspace;
}

export const DesktopExportPanel = ({ workspace }: ExportPanelProps) => {
  const workspacePermissionService = useService(
    WorkspacePermissionService
  ).permission;
  const isTeam = useLiveData(workspacePermissionService.isTeam$);
  const isOwner = useLiveData(workspacePermissionService.isOwner$);
  const isAdmin = useLiveData(workspacePermissionService.isAdmin$);

  const t = useI18n();
  const [saving, setSaving] = useState(false);
  const isOnline = useSystemOnline();
  const desktopApi = useService(DesktopApiService);

  const onExport = useAsyncCallback(async () => {
    if (saving || !workspace) {
      return;
    }
    setSaving(true);
    try {
      track.$.settingsPanel.workspace.export({
        type: 'workspace',
      });
      if (isOnline) {
        await workspace.engine.doc.waitForSynced();
        await workspace.engine.blob.fullSync();
      }

      const result = await desktopApi.handler?.dialog.saveDBFileAs(
        universalId({
          peer: workspace.flavour,
          type: 'workspace',
          id: workspace.id,
        }),
        workspace.name$.getValue() ?? 'db'
      );
      if (result?.error) {
        throw new Error(result.error);
      } else if (!result?.canceled) {
        notify.success({ title: t['Export success']() });
      }
    } catch (e: any) {
      notify.error({ title: t['Export failed'](), message: e.message });
    } finally {
      setSaving(false);
    }
  }, [desktopApi, isOnline, saving, t, workspace]);

  if (isTeam && !isOwner && !isAdmin) {
    return null;
  }

  return (
    <SettingRow name={t['Export']()} desc={t['Export Description']()}>
      <Button
        data-testid="export-affine-backup"
        onClick={onExport}
        disabled={saving}
      >
        {t['Export']()}
      </Button>
    </SettingRow>
  );
};
