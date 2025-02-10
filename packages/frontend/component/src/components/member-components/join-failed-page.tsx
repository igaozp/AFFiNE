import { AuthPageContainer } from '@affine/component/auth-components';
import {
  ErrorNames,
  type GetInviteInfoQuery,
  UserFriendlyError,
} from '@affine/graphql';
import { Trans, useI18n } from '@affine/i18n';

import { Avatar } from '../../ui/avatar';
import * as styles from './styles.css';

export const JoinFailedPage = ({
  inviteInfo,
  error,
}: {
  inviteInfo: GetInviteInfoQuery['getInviteInfo'];
  error?: any;
}) => {
  const userFriendlyError = UserFriendlyError.fromAnyError(error);
  const t = useI18n();
  return (
    <AuthPageContainer
      title={t['com.affine.fail-to-join-workspace.title']()}
      subtitle={
        userFriendlyError.name === ErrorNames.MEMBER_QUOTA_EXCEEDED ? (
          <div className={styles.content}>
            <Trans
              i18nKey={'com.affine.fail-to-join-workspace.description-1'}
              components={{
                1: (
                  <Avatar
                    url={`data:image/png;base64,${inviteInfo.workspace.avatar}`}
                    name={inviteInfo.workspace.name}
                    size={20}
                    style={{ marginLeft: 4 }}
                    colorfulFallback
                  />
                ),
                2: <span className={styles.inviteName} />,
              }}
              values={{
                workspaceName: inviteInfo.workspace.name,
              }}
            />
            <div>{t['com.affine.fail-to-join-workspace.description-2']()}</div>
          </div>
        ) : (
          <div>{t['error.' + userFriendlyError.name]()}</div>
        )
      }
    />
  );
};
