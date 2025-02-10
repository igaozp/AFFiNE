import { Loading, Scrollable } from '@affine/component';
import { WorkspaceDetailSkeleton } from '@affine/component/setting-components';
import type { ModalProps } from '@affine/component/ui/modal';
import { Modal } from '@affine/component/ui/modal';
import {
  AuthService,
  DefaultServerService,
  ServersService,
} from '@affine/core/modules/cloud';
import type { DialogComponentProps } from '@affine/core/modules/dialogs';
import type {
  SettingTab,
  WORKSPACE_DIALOG_SCHEMA,
} from '@affine/core/modules/dialogs/constant';
import { GlobalContextService } from '@affine/core/modules/global-context';
import { Trans } from '@affine/i18n';
import { ContactWithUsIcon } from '@blocksuite/icons/rc';
import { FrameworkScope, useLiveData, useService } from '@toeverything/infra';
import { debounce } from 'lodash-es';
import {
  Suspense,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { AccountSetting } from './account-setting';
import { GeneralSetting } from './general-setting';
import { IssueFeedbackModal } from './issue-feedback-modal';
import { SettingSidebar } from './setting-sidebar';
import { StarAFFiNEModal } from './star-affine-modal';
import * as style from './style.css';
import type { SettingState } from './types';
import { WorkspaceSetting } from './workspace-setting';

interface SettingProps extends ModalProps {
  activeTab?: SettingTab;
  onCloseSetting: () => void;
}

const isWorkspaceSetting = (key: string): boolean =>
  key.startsWith('workspace:');

const CenteredLoading = () => {
  return (
    <div className={style.centeredLoading}>
      <Loading size={24} />
    </div>
  );
};

const SettingModalInner = ({
  activeTab: initialActiveTab = 'appearance',
  onCloseSetting,
}: SettingProps) => {
  const [settingState, setSettingState] = useState<SettingState>({
    activeTab: initialActiveTab,
    scrollAnchor: undefined,
  });
  const globalContextService = useService(GlobalContextService);

  const currentServerId = useLiveData(
    globalContextService.globalContext.serverId.$
  );
  const serversService = useService(ServersService);
  const defaultServerService = useService(DefaultServerService);
  const currentServer =
    useLiveData(
      currentServerId ? serversService.server$(currentServerId) : null
    ) ?? defaultServerService.server;
  const loginStatus = useLiveData(
    currentServer.scope.get(AuthService).session.status$
  );

  const modalContentRef = useRef<HTMLDivElement>(null);
  const modalContentWrapperRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    let animationFrameId: number;
    const onResize = debounce(() => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        if (!modalContentRef.current || !modalContentWrapperRef.current) return;

        const wrapperWidth = modalContentWrapperRef.current.offsetWidth;
        const wrapperHeight = modalContentWrapperRef.current.offsetHeight;
        const contentWidth = modalContentRef.current.offsetWidth;

        const wrapper = modalContentWrapperRef.current;

        wrapper?.style.setProperty(
          '--setting-modal-width',
          `${wrapperWidth}px`
        );
        wrapper?.style.setProperty(
          '--setting-modal-height',
          `${wrapperHeight}px`
        );
        wrapper?.style.setProperty(
          '--setting-modal-content-width',
          `${contentWidth}px`
        );
        wrapper?.style.setProperty(
          '--setting-modal-gap-x',
          `${(wrapperWidth - contentWidth) / 2}px`
        );
      });
    }, 200);
    window.addEventListener('resize', onResize);
    onResize();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const onTabChange = useCallback(
    (key: SettingTab) => {
      setSettingState({ activeTab: key });
    },
    [setSettingState]
  );
  const [openIssueFeedbackModal, setOpenIssueFeedbackModal] = useState(false);
  const [openStarAFFiNEModal, setOpenStarAFFiNEModal] = useState(false);

  const handleOpenIssueFeedbackModal = useCallback(() => {
    setOpenIssueFeedbackModal(true);
  }, [setOpenIssueFeedbackModal]);

  const handleOpenStarAFFiNEModal = useCallback(() => {
    setOpenStarAFFiNEModal(true);
  }, [setOpenStarAFFiNEModal]);

  return (
    <FrameworkScope scope={currentServer.scope}>
      <SettingSidebar
        activeTab={settingState.activeTab}
        onTabChange={onTabChange}
      />
      <Scrollable.Root>
        <Scrollable.Viewport
          data-testid="setting-modal-content"
          className={style.wrapper}
          ref={modalContentWrapperRef}
        >
          <div className={style.centerContainer}>
            <div ref={modalContentRef} className={style.content}>
              <Suspense fallback={<WorkspaceDetailSkeleton />}>
                {}
                {settingState.activeTab === 'account' &&
                loginStatus === 'authenticated' ? (
                  <AccountSetting onChangeSettingState={setSettingState} />
                ) : isWorkspaceSetting(settingState.activeTab) ? (
                  <WorkspaceSetting
                    activeTab={settingState.activeTab}
                    onCloseSetting={onCloseSetting}
                    onChangeSettingState={setSettingState}
                  />
                ) : !isWorkspaceSetting(settingState.activeTab) ? (
                  <GeneralSetting
                    activeTab={settingState.activeTab}
                    scrollAnchor={settingState.scrollAnchor}
                    onChangeSettingState={setSettingState}
                  />
                ) : null}
              </Suspense>
            </div>
            <div className={style.footer}>
              <ContactWithUsIcon fontSize={16} />
              <Trans
                i18nKey={'com.affine.settings.suggestion-2'}
                components={{
                  1: (
                    <span
                      className={style.link}
                      onClick={handleOpenStarAFFiNEModal}
                    />
                  ),
                  2: (
                    <span
                      className={style.link}
                      onClick={handleOpenIssueFeedbackModal}
                    />
                  ),
                }}
              />
            </div>
            <StarAFFiNEModal
              open={openStarAFFiNEModal}
              setOpen={setOpenStarAFFiNEModal}
            />
            <IssueFeedbackModal
              open={openIssueFeedbackModal}
              setOpen={setOpenIssueFeedbackModal}
            />
          </div>
          <Scrollable.Scrollbar />
        </Scrollable.Viewport>
      </Scrollable.Root>
    </FrameworkScope>
  );
};

export const SettingDialog = ({
  close,
  activeTab,
}: DialogComponentProps<WORKSPACE_DIALOG_SCHEMA['setting']>) => {
  return (
    <Modal
      width={1280}
      height={920}
      contentOptions={{
        ['data-testid' as string]: 'setting-modal',
        style: {
          maxHeight: '85vh',
          maxWidth: '70vw',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
        },
      }}
      open
      onOpenChange={() => close()}
    >
      <Suspense fallback={<CenteredLoading />}>
        <SettingModalInner activeTab={activeTab} onCloseSetting={close} />
      </Suspense>
    </Modal>
  );
};
