import { Button, Loading } from '@affine/component';
import {
  Pagination,
  SettingHeader,
  SettingRow,
  SettingWrapper,
} from '@affine/component/setting-components';
import { getUpgradeQuestionnaireLink } from '@affine/core/components/hooks/affine/use-subscription-notify';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { useMutation } from '@affine/core/components/hooks/use-mutation';
import {
  AuthService,
  SubscriptionService,
  WorkspaceInvoicesService,
  WorkspaceSubscriptionService,
} from '@affine/core/modules/cloud';
import { WorkspaceQuotaService } from '@affine/core/modules/quota';
import { UrlService } from '@affine/core/modules/url';
import { WorkspaceService } from '@affine/core/modules/workspace';
import {
  createCustomerPortalMutation,
  type InvoicesQuery,
  InvoiceStatus,
  SubscriptionPlan,
  SubscriptionRecurring,
  UserFriendlyError,
} from '@affine/graphql';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';
import { cssVar } from '@toeverything/theme';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  CancelTeamAction,
  TeamResumeAction,
} from '../../general-setting/plans/actions';
import * as styles from './styles.css';

export const WorkspaceSettingBilling = () => {
  const workspace = useService(WorkspaceService).workspace;

  const t = useI18n();

  const subscriptionService = workspace?.scope.get(
    WorkspaceSubscriptionService
  );
  const subscription = useLiveData(
    subscriptionService?.subscription.subscription$
  );

  useEffect(() => {
    subscriptionService?.subscription.revalidate();
  }, [subscriptionService?.subscription]);

  if (workspace === null) {
    return null;
  }

  if (!subscription) {
    return <Loading />;
  }

  return (
    <>
      <SettingHeader
        title={t['com.affine.payment.billing-setting.title']()}
        subtitle={t['com.affine.payment.billing-setting.subtitle']()}
      />
      <SettingWrapper
        title={t['com.affine.payment.billing-setting.information']()}
      >
        <TeamCard />
        <TypeFormLink />
        <PaymentMethodUpdater />
        {subscription?.end && subscription.canceledAt ? (
          <ResumeSubscription expirationDate={subscription.end} />
        ) : null}
      </SettingWrapper>

      <SettingWrapper title={t['com.affine.payment.billing-setting.history']()}>
        <BillingHistory />
      </SettingWrapper>
    </>
  );
};

const TeamCard = () => {
  const t = useI18n();
  const workspaceSubscriptionService = useService(WorkspaceSubscriptionService);
  const workspaceQuotaService = useService(WorkspaceQuotaService);
  const subscriptionService = useService(SubscriptionService);
  const workspaceQuota = useLiveData(workspaceQuotaService.quota.quota$);
  const workspaceMemberCount = workspaceQuota?.memberCount;
  const teamSubscription = useLiveData(
    workspaceSubscriptionService.subscription.subscription$
  );
  const teamPrices = useLiveData(subscriptionService.prices.teamPrice$);

  const [openCancelModal, setOpenCancelModal] = useState(false);

  useEffect(() => {
    workspaceSubscriptionService.subscription.revalidate();
    workspaceQuotaService.quota.revalidate();
    subscriptionService.prices.revalidate();
  }, [
    subscriptionService,
    workspaceQuotaService,
    workspaceSubscriptionService,
  ]);

  const expiration = teamSubscription?.canceledAt;
  const nextBillingDate = teamSubscription?.nextBillAt;
  const recurring = teamSubscription?.recurring;
  const endDate = teamSubscription?.end;

  const description = useMemo(() => {
    if (recurring === SubscriptionRecurring.Yearly) {
      return t[
        'com.affine.settings.workspace.billing.team-workspace.description.billed.annually'
      ]();
    }
    if (recurring === SubscriptionRecurring.Monthly) {
      return t[
        'com.affine.settings.workspace.billing.team-workspace.description.billed.monthly'
      ]();
    }
    return t['com.affine.payment.billing-setting.free-trial']();
  }, [recurring, t]);

  const expirationDate = useMemo(() => {
    if (expiration && endDate) {
      return t[
        'com.affine.settings.workspace.billing.team-workspace.not-renewed'
      ]({
        date: new Date(endDate).toLocaleDateString(),
      });
    }
    if (nextBillingDate && endDate) {
      return t[
        'com.affine.settings.workspace.billing.team-workspace.next-billing-date'
      ]({
        date: new Date(endDate).toLocaleDateString(),
      });
    }
    return '';
  }, [endDate, expiration, nextBillingDate, t]);

  const amount = teamSubscription
    ? teamPrices && workspaceMemberCount
      ? teamSubscription.recurring === SubscriptionRecurring.Monthly
        ? String(
            (teamPrices.amount ? teamPrices.amount * workspaceMemberCount : 0) /
              100
          )
        : String(
            (teamPrices.yearlyAmount
              ? teamPrices.yearlyAmount * workspaceMemberCount
              : 0) / 100
          )
      : '?'
    : '0';
  const handleClick = useCallback(() => {
    setOpenCancelModal(true);
  }, []);

  return (
    <div className={styles.planCard}>
      <div className={styles.currentPlan}>
        <SettingRow
          spreadCol={false}
          name={t['com.affine.settings.workspace.billing.team-workspace']()}
          desc={
            <>
              <div>{description}</div>
              <div>{expirationDate}</div>
            </>
          }
        />
        <CancelTeamAction
          open={openCancelModal}
          onOpenChange={setOpenCancelModal}
        >
          <Button
            variant="primary"
            className={styles.cancelPlanButton}
            onClick={handleClick}
          >
            {t[
              'com.affine.settings.workspace.billing.team-workspace.cancel-plan'
            ]()}
          </Button>
        </CancelTeamAction>
      </div>
      <p className={styles.planPrice}>
        ${amount}
        <span className={styles.billingFrequency}>
          /
          {teamSubscription?.recurring === SubscriptionRecurring.Monthly
            ? t['com.affine.payment.billing-setting.month']()
            : t['com.affine.payment.billing-setting.year']()}
        </span>
      </p>
    </div>
  );
};

const ResumeSubscription = ({ expirationDate }: { expirationDate: string }) => {
  const t = useI18n();
  const [open, setOpen] = useState(false);
  const handleClick = useCallback(() => {
    setOpen(true);
  }, []);

  return (
    <SettingRow
      name={t['com.affine.payment.billing-setting.expiration-date']()}
      desc={t['com.affine.payment.billing-setting.expiration-date.description'](
        {
          expirationDate: new Date(expirationDate).toLocaleDateString(),
        }
      )}
    >
      <TeamResumeAction open={open} onOpenChange={setOpen}>
        <Button onClick={handleClick}>
          {t['com.affine.payment.billing-setting.resume-subscription']()}
        </Button>
      </TeamResumeAction>
    </SettingRow>
  );
};

const TypeFormLink = () => {
  const t = useI18n();
  const workspaceSubscriptionService = useService(WorkspaceSubscriptionService);
  const authService = useService(AuthService);

  const workspaceSubscription = useLiveData(
    workspaceSubscriptionService.subscription.subscription$
  );
  const account = useLiveData(authService.session.account$);

  if (!account) return null;

  const link = getUpgradeQuestionnaireLink({
    name: account.info?.name,
    id: account.id,
    email: account.email,
    recurring: workspaceSubscription?.recurring ?? SubscriptionRecurring.Yearly,
    plan: SubscriptionPlan.Team,
  });

  return (
    <SettingRow
      className={styles.paymentMethod}
      name={t['com.affine.payment.billing-type-form.title']()}
      desc={t['com.affine.payment.billing-type-form.description']()}
    >
      <a target="_blank" href={link} rel="noreferrer">
        <Button>{t['com.affine.payment.billing-type-form.go']()}</Button>
      </a>
    </SettingRow>
  );
};

const PaymentMethodUpdater = () => {
  const { isMutating, trigger } = useMutation({
    mutation: createCustomerPortalMutation,
  });
  const urlService = useService(UrlService);
  const t = useI18n();

  const update = useAsyncCallback(async () => {
    await trigger(null, {
      onSuccess: data => {
        urlService.openPopupWindow(data.createCustomerPortal);
      },
    });
  }, [trigger, urlService]);

  return (
    <SettingRow
      className={styles.paymentMethod}
      name={t['com.affine.payment.billing-setting.payment-method']()}
      desc={t[
        'com.affine.payment.billing-setting.payment-method.description'
      ]()}
    >
      <Button onClick={update} loading={isMutating} disabled={isMutating}>
        {t['com.affine.payment.billing-setting.payment-method.go']()}
      </Button>
    </SettingRow>
  );
};

const BillingHistory = () => {
  const t = useI18n();

  const invoicesService = useService(WorkspaceInvoicesService);
  const pageInvoices = useLiveData(invoicesService.invoices.pageInvoices$);
  const invoiceCount = useLiveData(invoicesService.invoices.invoiceCount$);
  const isLoading = useLiveData(invoicesService.invoices.isLoading$);
  const error = useLiveData(invoicesService.invoices.error$);
  const pageNum = useLiveData(invoicesService.invoices.pageNum$);

  useEffect(() => {
    invoicesService.invoices.revalidate();
  }, [invoicesService]);

  const handlePageChange = useCallback(
    (_: number, pageNum: number) => {
      invoicesService.invoices.setPageNum(pageNum);
      invoicesService.invoices.revalidate();
    },
    [invoicesService]
  );

  if (invoiceCount === undefined) {
    if (isLoading) {
      return <BillingHistorySkeleton />;
    } else {
      return (
        <span style={{ color: cssVar('errorColor') }}>
          {error
            ? UserFriendlyError.fromAnyError(error).message
            : 'Failed to load members'}
        </span>
      );
    }
  }

  return (
    <div className={styles.history}>
      <div className={styles.historyContent}>
        {invoiceCount === 0 ? (
          <p className={styles.noInvoice}>
            {t['com.affine.payment.billing-setting.no-invoice']()}
          </p>
        ) : (
          pageInvoices?.map(invoice => (
            <InvoiceLine key={invoice.id} invoice={invoice} />
          ))
        )}
      </div>

      {invoiceCount > invoicesService.invoices.PAGE_SIZE && (
        <Pagination
          totalCount={invoiceCount}
          countPerPage={invoicesService.invoices.PAGE_SIZE}
          pageNum={pageNum}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

const InvoiceLine = ({
  invoice,
}: {
  invoice: NonNullable<InvoicesQuery['currentUser']>['invoices'][0];
}) => {
  const t = useI18n();
  const urlService = useService(UrlService);

  const open = useCallback(() => {
    if (invoice.link) {
      urlService.openPopupWindow(invoice.link);
    }
  }, [invoice.link, urlService]);

  return (
    <SettingRow
      key={invoice.id}
      name={new Date(invoice.createdAt).toLocaleDateString()}
      desc={`${
        invoice.status === InvoiceStatus.Paid
          ? t['com.affine.payment.billing-setting.paid']()
          : ''
      } $${invoice.amount / 100}`}
    >
      <Button onClick={open}>
        {t['com.affine.payment.billing-setting.view-invoice']()}
      </Button>
    </SettingRow>
  );
};

const BillingHistorySkeleton = () => {
  return (
    <div className={styles.billingHistorySkeleton}>
      <Loading />
    </div>
  );
};
