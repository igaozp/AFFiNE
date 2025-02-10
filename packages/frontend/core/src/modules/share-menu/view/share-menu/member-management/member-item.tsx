import {
  Avatar,
  Menu,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  notify,
  Tooltip,
} from '@affine/component';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { DocService } from '@affine/core/modules/doc';
import {
  DocGrantedUsersService,
  type GrantedUser,
  GuardService,
} from '@affine/core/modules/permissions';
import { DocRole, UserFriendlyError } from '@affine/graphql';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';
import { useMemo } from 'react';

import { PlanTag } from '../plan-tag';
import * as styles from './member-item.css';

export const MemberItem = ({
  openPaywallModal,
  hittingPaywall,
  grantedUser,
}: {
  grantedUser: GrantedUser;
  hittingPaywall: boolean;
  openPaywallModal: () => void;
}) => {
  const user = grantedUser.user;

  const role = useMemo(() => {
    switch (grantedUser.role) {
      case DocRole.Owner:
        return 'Owner';
      case DocRole.Manager:
        return 'Can manage';
      case DocRole.Editor:
        return 'Can edit';
      case DocRole.Reader:
        return 'Can read';
      default:
        return '';
    }
  }, [grantedUser.role]);

  return (
    <div className={styles.memberItemStyle}>
      <div className={styles.memberContainerStyle}>
        <Avatar
          key={user.id}
          url={user.avatarUrl || ''}
          name={user.name}
          size={36}
        />
        <div className={styles.memberInfoStyle}>
          <Tooltip
            content={user.name}
            rootOptions={{ delayDuration: 1000 }}
            options={{
              className: styles.tooltipContentStyle,
            }}
          >
            <div className={styles.memberNameStyle}>{user.name}</div>
          </Tooltip>
          <Tooltip
            content={user.email}
            rootOptions={{ delayDuration: 1000 }}
            options={{
              className: styles.tooltipContentStyle,
            }}
          >
            <div className={styles.memberEmailStyle}>{user.email}</div>
          </Tooltip>
        </div>
      </div>

      <Menu
        items={
          <Options
            userId={user.id}
            memberRole={grantedUser.role}
            hittingPaywall={hittingPaywall}
            openPaywallModal={openPaywallModal}
          />
        }
        contentOptions={{
          align: 'start',
        }}
      >
        <MenuTrigger
          variant="plain"
          className={styles.menuTriggerStyle}
          contentStyle={{
            width: '100%',
          }}
        >
          {role}
        </MenuTrigger>
      </Menu>
    </div>
  );
};

const Options = ({
  openPaywallModal,
  hittingPaywall,
  memberRole,
  userId,
}: {
  userId: string;
  memberRole: DocRole;
  hittingPaywall: boolean;
  openPaywallModal: () => void;
}) => {
  const t = useI18n();
  const docGrantedUsersService = useService(DocGrantedUsersService);
  const docService = useService(DocService);
  const guardService = useService(GuardService);

  const canTransferOwner = useLiveData(
    guardService.can$('Doc_TransferOwner', docService.doc.id)
  );
  const canManageUsers = useLiveData(
    guardService.can$('Doc_Users_Manage', docService.doc.id)
  );

  const changeToManager = useAsyncCallback(async () => {
    try {
      await docGrantedUsersService.updateUserRole(userId, DocRole.Manager);
    } catch (error) {
      const err = UserFriendlyError.fromAnyError(error);
      notify.error({
        title: t[`error.${err.name}`](err.data),
      });
    }
  }, [docGrantedUsersService, userId, t]);

  const changeToEditor = useAsyncCallback(async () => {
    if (hittingPaywall) {
      openPaywallModal();
      return;
    }
    try {
      await docGrantedUsersService.updateUserRole(userId, DocRole.Editor);
    } catch (error) {
      const err = UserFriendlyError.fromAnyError(error);
      notify.error({
        title: t[`error.${err.name}`](err.data),
      });
    }
  }, [docGrantedUsersService, hittingPaywall, openPaywallModal, userId, t]);

  const changeToReader = useAsyncCallback(async () => {
    if (hittingPaywall) {
      openPaywallModal();
      return;
    }
    try {
      await docGrantedUsersService.updateUserRole(userId, DocRole.Reader);
    } catch (error) {
      const err = UserFriendlyError.fromAnyError(error);
      notify.error({
        title: t[`error.${err.name}`](err.data),
      });
    }
  }, [docGrantedUsersService, hittingPaywall, openPaywallModal, userId, t]);

  const changeToOwner = useAsyncCallback(async () => {
    try {
      await docGrantedUsersService.updateUserRole(userId, DocRole.Owner);
    } catch (error) {
      const err = UserFriendlyError.fromAnyError(error);
      notify.error({
        title: t[`error.${err.name}`](err.data),
      });
    }
  }, [docGrantedUsersService, userId, t]);

  const removeMember = useAsyncCallback(async () => {
    try {
      await docGrantedUsersService.revokeUsersRole(userId);
    } catch (error) {
      const err = UserFriendlyError.fromAnyError(error);
      notify.error({
        title: t[`error.${err.name}`](err.data),
      });
    }
  }, [docGrantedUsersService, userId, t]);

  const operationButtonInfo = useMemo(() => {
    return [
      {
        label: t['com.affine.share-menu.option.permission.can-manage'](),
        onClick: changeToManager,
        role: DocRole.Manager,
      },
      {
        label: t['com.affine.share-menu.option.permission.can-edit'](),
        onClick: changeToEditor,
        role: DocRole.Editor,
        showPlanTag: true,
      },
      {
        label: t['com.affine.share-menu.option.permission.can-read'](),
        onClick: changeToReader,
        role: DocRole.Reader,
        showPlanTag: true,
      },
    ];
  }, [changeToEditor, changeToManager, changeToReader, t]);

  return (
    <>
      {operationButtonInfo.map(item => (
        <MenuItem
          key={item.label}
          onSelect={item.onClick}
          selected={memberRole === item.role}
          disabled={!canManageUsers}
        >
          <div className={styles.planTagContainer}>
            {item.label} {item.showPlanTag ? <PlanTag /> : null}
          </div>
        </MenuItem>
      ))}
      <MenuItem onSelect={changeToOwner} disabled={!canTransferOwner}>
        {t['com.affine.share-menu.member-management.set-as-owner']()}
      </MenuItem>
      <MenuSeparator />
      <MenuItem
        onSelect={removeMember}
        type="danger"
        className={styles.remove}
        disabled={!canManageUsers}
      >
        {t['com.affine.share-menu.member-management.remove']()}
      </MenuItem>
    </>
  );
};
