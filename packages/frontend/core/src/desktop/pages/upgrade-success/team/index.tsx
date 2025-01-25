import { Button } from '@affine/component';
import { AuthPageContainer } from '@affine/component/auth-components';
import { getSubscriptionInfo } from '@affine/core/components/hooks/affine/use-subscription-notify';
import { useNavigateHelper } from '@affine/core/components/hooks/use-navigate-helper';
import { Trans, useI18n } from '@affine/i18n';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import * as styles from './styles.css';

/**
 * /upgrade-success/team page
 *
 * only on web
 */
export const Component = () => {
  const t = useI18n();
  const [params] = useSearchParams();
  const subscriptionInfo = getSubscriptionInfo(params);

  const { jumpToPage, jumpToOpenInApp, jumpToIndex } = useNavigateHelper();
  const openWorkspace = useCallback(() => {
    if (params.get('schema')) {
      jumpToOpenInApp('bring-to-front');
    } else {
      if (subscriptionInfo.workspaceId) {
        jumpToPage(subscriptionInfo.workspaceId, 'all');
        return;
      }
      jumpToIndex();
    }
  }, [
    jumpToIndex,
    jumpToOpenInApp,
    jumpToPage,
    params,
    subscriptionInfo.workspaceId,
  ]);

  const subtitle = (
    <div className={styles.leftContentText}>
      <div>{t['com.affine.payment.upgrade-success-page.team.text-1']()}</div>
      <div>
        <Trans
          i18nKey={'com.affine.payment.upgrade-success-page.team.text-2'}
          components={{
            1: (
              <a
                href="mailto:support@toeverything.info"
                className={styles.mail}
              />
            ),
          }}
        />
      </div>
    </div>
  );

  return (
    <AuthPageContainer
      title={t['com.affine.payment.upgrade-success-page.title']()}
      subtitle={subtitle}
    >
      <Button variant="primary" size="extraLarge" onClick={openWorkspace}>
        {t['Visit Workspace']()}
      </Button>
    </AuthPageContainer>
  );
};
