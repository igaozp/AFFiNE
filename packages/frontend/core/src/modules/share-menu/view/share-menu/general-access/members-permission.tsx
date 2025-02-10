import { Menu, MenuItem, MenuTrigger } from '@affine/component';
import { DocRole } from '@affine/graphql';
import { useI18n } from '@affine/i18n';
import { useCallback, useMemo, useState } from 'react';

import { PlanTag } from '../plan-tag';
import * as styles from './styles.css';

const getRoleName = (role: DocRole, t: ReturnType<typeof useI18n>) => {
  switch (role) {
    case DocRole.Manager:
      return t['com.affine.share-menu.option.permission.can-manage']();
    case DocRole.Editor:
      return t['com.affine.share-menu.option.permission.can-edit']();
    case DocRole.Reader:
      return t['com.affine.share-menu.option.permission.can-read']();
    default:
      return '';
  }
};
// TODO(@JimmFly): impl the real permission
export const MembersPermission = ({
  openPaywallModal,
  hittingPaywall,
  disabled,
}: {
  hittingPaywall: boolean;
  openPaywallModal?: () => void;
  disabled?: boolean;
}) => {
  const t = useI18n();
  const [docRole, setDocRole] = useState<DocRole>(DocRole.Manager);
  const currentRoleName = useMemo(() => getRoleName(docRole, t), [docRole, t]);

  const changePermission = useCallback((newPermission: DocRole) => {
    setDocRole(newPermission);
  }, []);

  const selectManage = useCallback(() => {
    changePermission(DocRole.Manager);
  }, [changePermission]);

  const selectEdit = useCallback(() => {
    if (hittingPaywall) {
      openPaywallModal?.();
      return;
    }
    changePermission(DocRole.Editor);
  }, [changePermission, hittingPaywall, openPaywallModal]);

  const selectRead = useCallback(() => {
    if (hittingPaywall) {
      openPaywallModal?.();
      return;
    }
    changePermission(DocRole.Reader);
  }, [changePermission, hittingPaywall, openPaywallModal]);
  return (
    <div className={styles.rowContainerStyle}>
      <div className={styles.labelStyle}>
        {t['com.affine.share-menu.option.permission.label']()}
      </div>
      <Menu
        contentOptions={{
          align: 'end',
        }}
        items={
          disabled ? null : (
            <>
              <MenuItem
                onSelect={selectManage}
                selected={docRole === DocRole.Manager}
              >
                <div className={styles.publicItemRowStyle}>
                  {t['com.affine.share-menu.option.permission.can-manage']()}
                </div>
              </MenuItem>
              <MenuItem
                onSelect={selectEdit}
                selected={docRole === DocRole.Editor}
              >
                <div className={styles.publicItemRowStyle}>
                  <div className={styles.tagContainerStyle}>
                    {t['com.affine.share-menu.option.permission.can-edit']()}
                    <PlanTag />
                  </div>
                </div>
              </MenuItem>
              <MenuItem
                onSelect={selectRead}
                selected={docRole === DocRole.Reader}
              >
                <div className={styles.publicItemRowStyle}>
                  <div className={styles.tagContainerStyle}>
                    {t['com.affine.share-menu.option.permission.can-read']()}
                    <PlanTag />
                  </div>
                </div>
              </MenuItem>
            </>
          )
        }
      >
        <MenuTrigger
          className={styles.menuTriggerStyle}
          variant="plain"
          contentStyle={{
            width: '100%',
          }}
          disabled={disabled}
        >
          {currentRoleName}
        </MenuTrigger>
      </Menu>
    </div>
  );
};
