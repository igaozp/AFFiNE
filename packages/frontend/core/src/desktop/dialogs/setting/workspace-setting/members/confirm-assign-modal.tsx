import { ConfirmModal, Input } from '@affine/component';
import type { Member } from '@affine/core/modules/permissions';
import { useI18n } from '@affine/i18n';
import { cssVar } from '@toeverything/theme';

import * as styles from './styles.css';

export const ConfirmAssignModal = ({
  open,
  setOpen,
  member,
  inputValue,
  setInputValue,
  isEquals,
  onConfirm,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  isEquals: boolean;
  member: Member;
  inputValue: string;
  onConfirm: () => void;
  setInputValue: (value: string) => void;
}) => {
  const t = useI18n();

  return (
    <ConfirmModal
      childrenContentClassName={styles.confirmAssignModalContent}
      open={open}
      onOpenChange={setOpen}
      title={t['com.affine.payment.member.team.assign.confirm.title']()}
      confirmText={t['com.affine.payment.member.team.assign.confirm.button']()}
      onConfirm={onConfirm}
      confirmButtonOptions={{ disabled: !isEquals, variant: 'error' }}
    >
      <div className={styles.confirmAssignModalContent}>
        <div>
          <p>
            {t['com.affine.payment.member.team.assign.confirm.description']({
              name: member.name || member.email || member.id,
            })}
          </p>
          <p>
            {t['com.affine.payment.member.team.assign.confirm.description-1']()}
          </p>
          <p>
            {t['com.affine.payment.member.team.assign.confirm.description-2']()}
          </p>
          <p>
            {t['com.affine.payment.member.team.assign.confirm.description-3']()}
          </p>
        </div>
        <div className={styles.confirmInputContainer}>
          {t['com.affine.payment.member.team.assign.confirm.description-4']()}
          <Input
            value={inputValue}
            inputStyle={{ fontSize: cssVar('fontSm') }}
            onChange={setInputValue}
            placeholder={t.t(
              'com.affine.payment.member.team.assign.confirm.placeholder'
            )}
          />
        </div>
      </div>
    </ConfirmModal>
  );
};
