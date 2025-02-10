import {
  Button,
  Checkbox,
  Loading,
  Menu,
  MenuItem,
  MenuTrigger,
  notify,
  RowInput,
} from '@affine/component';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { WorkspaceDialogService } from '@affine/core/modules/dialogs';
import {
  DocGrantedUsersService,
  type Member,
  MemberSearchService,
} from '@affine/core/modules/permissions';
import {
  DocRole,
  UserFriendlyError,
  WorkspaceMemberStatus,
} from '@affine/graphql';
import { useI18n } from '@affine/i18n';
import { ArrowLeftBigIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import clsx from 'clsx';
import {
  type CompositionEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Virtuoso } from 'react-virtuoso';

import { PlanTag } from '../plan-tag';
import { Scroller } from '../scroller';
import * as styles from './invite-member-editor.css';
import { MemberItem } from './member-item';
import { SelectedMemberItem } from './selected-member-item';

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

export const InviteMemberEditor = ({
  openPaywallModal,
  hittingPaywall,
  onClickCancel,
}: {
  hittingPaywall: boolean;
  openPaywallModal: () => void;
  onClickCancel: () => void;
}) => {
  const t = useI18n();
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const docGrantedUsersService = useService(DocGrantedUsersService);
  const [inviteDocRoleType, setInviteDocRoleType] = useState<DocRole>(
    DocRole.Manager
  );

  const memberSearchService = useService(MemberSearchService);
  const searchText = useLiveData(memberSearchService.searchText$);

  useEffect(() => {
    // reset the search text when the component is mounted
    memberSearchService.reset();
    memberSearchService.loadMore();
  }, [memberSearchService]);

  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [composing, setComposing] = useState(false);

  const handleValueChange = useCallback(
    (value: string) => {
      if (!composing) {
        memberSearchService.search(value);
      }
    },
    [composing, memberSearchService]
  );

  const [shouldSendEmail, setShouldSendEmail] = useState(false);
  const workspaceDialogService = useService(WorkspaceDialogService);

  const onInvite = useAsyncCallback(async () => {
    const selectedMemberIds = selectedMembers.map(member => member.id);
    try {
      await docGrantedUsersService.grantUsersRole(
        selectedMemberIds,
        inviteDocRoleType
      );

      notify.success({
        title: 'Invite successful',
      });
    } catch (error) {
      const err = UserFriendlyError.fromAnyError(error);
      notify.error({
        title: t[`error.${err.name}`](err.data),
      });
    }
  }, [docGrantedUsersService, inviteDocRoleType, selectedMembers, t]);

  const handleCompositionStart: CompositionEventHandler<HTMLInputElement> =
    useCallback(() => {
      setComposing(true);
    }, []);

  const handleCompositionEnd: CompositionEventHandler<HTMLInputElement> =
    useCallback(
      e => {
        setComposing(false);
        memberSearchService.search(e.currentTarget.value);
      },
      [memberSearchService]
    );

  const onCheckboxChange = useCallback(() => {
    setShouldSendEmail(prev => !prev);
  }, []);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);
  const onFocus = useCallback(() => {
    setFocused(true);
  }, []);
  const onBlur = useCallback(() => {
    setFocused(false);
  }, []);

  const handleRemoved = useCallback(
    (memberId: string) => {
      setSelectedMembers(prev => prev.filter(member => member.id !== memberId));
      focusInput();
    },
    [focusInput]
  );

  const switchToMemberManagementTab = useCallback(() => {
    workspaceDialogService.open('setting', {
      activeTab: 'workspace:preference',
    });
  }, [workspaceDialogService]);

  const handleClickMember = useCallback((member: Member) => {
    setSelectedMembers(prev => {
      if (prev.some(m => m.id === member.id)) {
        // if the member is already in the list, just return
        return prev;
      }
      return [...prev, member];
    });
  }, []);

  const handleRoleChange = useCallback((role: DocRole) => {
    setInviteDocRoleType(role);
  }, []);

  return (
    <div className={styles.containerStyle}>
      <div className={styles.headerStyle} onClick={onClickCancel}>
        <ArrowLeftBigIcon className={styles.iconStyle} />
        {t['com.affine.share-menu.invite-editor.header']()}
      </div>
      <div className={styles.memberListStyle}>
        <div
          className={clsx(styles.InputContainer, {
            focus: focused,
          })}
        >
          <div className={styles.inlineMembersContainer}>
            {selectedMembers.map((member, idx) => {
              if (!member) {
                return null;
              }
              const onRemoved = () => handleRemoved(member.id);
              return (
                <SelectedMemberItem
                  key={member.id}
                  idx={idx}
                  onRemoved={onRemoved}
                  member={member}
                />
              );
            })}
            <RowInput
              ref={inputRef}
              value={searchText}
              onChange={handleValueChange}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onFocus={onFocus}
              onBlur={onBlur}
              autoFocus
              className={styles.searchInput}
              placeholder={t[
                'com.affine.share-menu.invite-editor.placeholder'
              ]()}
            />
          </div>
          {!selectedMembers.length ? null : (
            <RoleSelector
              openPaywallModal={openPaywallModal}
              hittingPaywall={hittingPaywall}
              inviteDocRoleType={inviteDocRoleType}
              onRoleChange={handleRoleChange}
            />
          )}
        </div>
        <div className={styles.sentEmail} onClick={onCheckboxChange}>
          <Checkbox
            className={styles.checkbox}
            checked={shouldSendEmail}
            disabled // not supported yet
          />
          {t['com.affine.share-menu.invite-editor.sent-email']()}
        </div>
        <Result onClickMember={handleClickMember} />
      </div>
      <div className={styles.footerStyle}>
        <span
          className={styles.manageMemberStyle}
          onClick={switchToMemberManagementTab}
        >
          {t['com.affine.share-menu.invite-editor.manage-members']()}
        </span>
        <div className={styles.buttonsContainer}>
          <Button className={styles.button} onClick={onClickCancel}>
            {t['Cancel']()}
          </Button>
          <Button
            className={styles.button}
            variant="primary"
            disabled={!selectedMembers.length}
            onClick={onInvite}
          >
            {t['com.affine.share-menu.invite-editor.invite']()}
          </Button>
        </div>
      </div>
    </div>
  );
};

const Result = ({
  onClickMember,
}: {
  onClickMember: (member: Member) => void;
}) => {
  const memberSearchService = useService(MemberSearchService);
  const result = useLiveData(memberSearchService.result$);
  const isLoading = useLiveData(memberSearchService.isLoading$);

  const activeMembers = useMemo(() => {
    return result.filter(
      member => member.status === WorkspaceMemberStatus.Accepted
    );
  }, [result]);

  const itemContentRenderer = useCallback(
    (_index: number, data: Member) => {
      const handleSelect = () => {
        onClickMember(data);
      };
      return (
        <div onClick={handleSelect}>
          <MemberItem member={data} />
        </div>
      );
    },
    [onClickMember]
  );

  const t = useI18n();

  const loadMore = useCallback(() => {
    memberSearchService.loadMore();
  }, [memberSearchService]);

  if (!activeMembers || activeMembers.length === 0) {
    if (isLoading) {
      return <Loading />;
    }
    return (
      <div className={styles.noFound}>
        {t['com.affine.share-menu.invite-editor.no-found']()}
      </div>
    );
  }

  return (
    <Virtuoso
      components={{
        Scroller,
      }}
      data={activeMembers}
      itemContent={itemContentRenderer}
      endReached={loadMore}
    />
  );
};

const RoleSelector = ({
  openPaywallModal,
  hittingPaywall,
  inviteDocRoleType,
  onRoleChange,
}: {
  openPaywallModal: () => void;
  inviteDocRoleType: DocRole;
  onRoleChange: (role: DocRole) => void;
  hittingPaywall: boolean;
}) => {
  const t = useI18n();
  const currentRoleName = useMemo(
    () => getRoleName(inviteDocRoleType, t),
    [inviteDocRoleType, t]
  );

  const changeToAdmin = useCallback(
    () => onRoleChange(DocRole.Manager),
    [onRoleChange]
  );
  const changeToWrite = useCallback(() => {
    if (hittingPaywall) {
      openPaywallModal();
      return;
    }
    onRoleChange(DocRole.Editor);
  }, [hittingPaywall, onRoleChange, openPaywallModal]);
  const changeToRead = useCallback(() => {
    if (hittingPaywall) {
      openPaywallModal();
      return;
    }
    onRoleChange(DocRole.Reader);
  }, [hittingPaywall, onRoleChange, openPaywallModal]);
  return (
    <div className={styles.roleSelectorContainer}>
      <Menu
        contentOptions={{
          align: 'end',
        }}
        items={
          <>
            <MenuItem
              onSelect={changeToAdmin}
              selected={inviteDocRoleType === DocRole.Manager}
            >
              {t['com.affine.share-menu.option.permission.can-manage']()}
            </MenuItem>
            <MenuItem
              onSelect={changeToWrite}
              selected={inviteDocRoleType === DocRole.Editor}
            >
              <div className={styles.planTagContainer}>
                {t['com.affine.share-menu.option.permission.can-edit']()}
                <PlanTag />
              </div>
            </MenuItem>
            <MenuItem
              onSelect={changeToRead}
              selected={inviteDocRoleType === DocRole.Reader}
            >
              <div className={styles.planTagContainer}>
                {t['com.affine.share-menu.option.permission.can-read']()}
                <PlanTag />
              </div>
            </MenuItem>
          </>
        }
      >
        <MenuTrigger
          className={styles.menuTriggerStyle}
          variant="plain"
          contentStyle={{
            width: '100%',
          }}
        >
          {currentRoleName}
        </MenuTrigger>
      </Menu>
    </div>
  );
};
