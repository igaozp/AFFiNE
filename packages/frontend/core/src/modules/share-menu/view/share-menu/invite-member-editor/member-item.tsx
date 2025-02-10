import { Avatar, Tooltip } from '@affine/component';
import type { Member } from '@affine/core/modules/permissions';

import * as styles from './member-item.css';

export const MemberItem = ({ member }: { member: Member }) => {
  return (
    <div className={styles.memberItemStyle}>
      <div className={styles.memberContainerStyle}>
        <Avatar
          key={member.id}
          url={member.avatarUrl || ''}
          name={member.name || ''}
          size={36}
        />
        <div className={styles.memberInfoStyle}>
          <Tooltip
            content={member.name}
            rootOptions={{ delayDuration: 1000 }}
            options={{
              className: styles.tooltipContentStyle,
            }}
          >
            <div className={styles.memberNameStyle}>{member.name}</div>
          </Tooltip>
          <Tooltip
            content={member.email}
            rootOptions={{ delayDuration: 1000 }}
            options={{
              className: styles.tooltipContentStyle,
            }}
          >
            <div className={styles.memberEmailStyle}>{member.email}</div>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
