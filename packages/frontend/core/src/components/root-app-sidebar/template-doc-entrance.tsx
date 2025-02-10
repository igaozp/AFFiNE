import { Menu, MenuItem, MenuSeparator } from '@affine/component';
import { MenuItem as SidebarMenuItem } from '@affine/core/modules/app-sidebar/views';
import { DocsService } from '@affine/core/modules/doc';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { TemplateListMenuContentScrollable } from '@affine/core/modules/template-doc/view/template-list-menu';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { inferOpenMode } from '@affine/core/utils';
import { useI18n } from '@affine/i18n';
import track from '@affine/track';
import { TemplateIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback, useState } from 'react';

export const TemplateDocEntrance = () => {
  const t = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const featureFlagService = useService(FeatureFlagService);
  const enabled = useLiveData(featureFlagService.flags.enable_template_doc.$);

  const toggleMenu = useCallback(() => {
    setMenuOpen(prev => !prev);
  }, []);

  const onMenuOpenChange = useCallback((open: boolean) => {
    if (open) track.$.sidebar.template.openTemplateListMenu();
    setMenuOpen(open);
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <SidebarMenuItem
      data-testid="sidebar-template-doc-entrance"
      icon={<TemplateIcon />}
      onClick={toggleMenu}
    >
      <Menu
        rootOptions={{ open: menuOpen, onOpenChange: onMenuOpenChange }}
        contentOptions={{
          side: 'right',
          align: 'end',
          alignOffset: -4,
          sideOffset: 16,
          style: { width: 280 },
        }}
        items={
          <TemplateListMenuContentScrollable
            asLink
            suffixItems={
              <>
                <MenuSeparator />
                <CreateNewTemplateMenuItem />
              </>
            }
          />
        }
      >
        <span>{t['Template']()}</span>
      </Menu>
    </SidebarMenuItem>
  );
};

const CreateNewTemplateMenuItem = () => {
  const t = useI18n();
  const docsService = useService(DocsService);
  const workbench = useService(WorkbenchService).workbench;

  const createNewTemplate = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const record = docsService.createDoc({ isTemplate: true });
      workbench.openDoc(record.id, { at: inferOpenMode(e) });
    },
    [docsService, workbench]
  );

  return (
    <MenuItem
      data-testid="template-doc-item-create"
      prefixIcon={<TemplateIcon />}
      onClick={createNewTemplate}
      onAuxClick={createNewTemplate}
    >
      {t['com.affine.template-list.create-new']()}
    </MenuItem>
  );
};
