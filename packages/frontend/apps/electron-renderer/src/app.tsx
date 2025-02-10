import { AffineContext } from '@affine/core/components/context';
import { WindowsAppControls } from '@affine/core/components/pure/header/windows-app-controls';
import { AppContainer } from '@affine/core/desktop/components/app-container';
import { router } from '@affine/core/desktop/router';
import { configureCommonModules } from '@affine/core/modules';
import { configureAppTabsHeaderModule } from '@affine/core/modules/app-tabs-header';
import { configureDesktopBackupModule } from '@affine/core/modules/backup';
import { ValidatorProvider } from '@affine/core/modules/cloud';
import {
  configureDesktopApiModule,
  DesktopApiService,
} from '@affine/core/modules/desktop-api';
import { WorkspaceDialogService } from '@affine/core/modules/dialogs';
import { DocsService } from '@affine/core/modules/doc';
import {
  configureSpellCheckSettingModule,
  EditorSettingService,
} from '@affine/core/modules/editor-setting';
import { configureFindInPageModule } from '@affine/core/modules/find-in-page';
import { GlobalContextService } from '@affine/core/modules/global-context';
import { I18nProvider } from '@affine/core/modules/i18n';
import { LifecycleService } from '@affine/core/modules/lifecycle';
import {
  configureElectronStateStorageImpls,
  NbstoreProvider,
} from '@affine/core/modules/storage';
import {
  ClientSchemeProvider,
  PopupWindowProvider,
} from '@affine/core/modules/url';
import {
  configureDesktopWorkbenchModule,
  WorkbenchService,
} from '@affine/core/modules/workbench';
import { WorkspacesService } from '@affine/core/modules/workspace';
import { configureBrowserWorkspaceFlavours } from '@affine/core/modules/workspace-engine';
import createEmotionCache from '@affine/core/utils/create-emotion-cache';
import { apis, events } from '@affine/electron-api';
import { StoreManagerClient } from '@affine/nbstore/worker/client';
import { CacheProvider } from '@emotion/react';
import { Framework, FrameworkRoot, getCurrentStore } from '@toeverything/infra';
import { OpClient } from '@toeverything/infra/op';
import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';

import { DesktopThemeSync } from './theme-sync';

const storeManagerClient = createStoreManagerClient();
window.addEventListener('beforeunload', () => {
  storeManagerClient.dispose();
});

const desktopWhiteList = [
  '/open-app/signin-redirect',
  '/open-app/url',
  '/upgrade-success',
  '/ai-upgrade-success',
  '/share',
  '/oauth',
  '/magic-link',
];
if (
  !BUILD_CONFIG.isElectron &&
  BUILD_CONFIG.debug &&
  desktopWhiteList.every(path => !location.pathname.startsWith(path))
) {
  document.body.innerHTML = `<h1 style="color:red;font-size:5rem;text-align:center;">Don't run electron entry in browser.</h1>`;
  throw new Error('Wrong distribution');
}

const cache = createEmotionCache();

const future = {
  v7_startTransition: true,
} as const;

const framework = new Framework();
configureCommonModules(framework);
configureElectronStateStorageImpls(framework);
configureBrowserWorkspaceFlavours(framework);
configureDesktopWorkbenchModule(framework);
configureAppTabsHeaderModule(framework);
configureFindInPageModule(framework);
configureDesktopApiModule(framework);
configureSpellCheckSettingModule(framework);
configureDesktopBackupModule(framework);
framework.impl(NbstoreProvider, {
  openStore(key, options) {
    const { store, dispose } = storeManagerClient.open(key, options);

    return {
      store,
      dispose: () => {
        dispose();
      },
    };
  },
});
framework.impl(PopupWindowProvider, p => {
  const apis = p.get(DesktopApiService).api;
  return {
    open: (url: string) => {
      apis.handler.ui.openExternal(url).catch(e => {
        console.error('Failed to open external URL', e);
      });
    },
  };
});
framework.impl(ClientSchemeProvider, p => {
  const appInfo = p.get(DesktopApiService).appInfo;
  return {
    getClientScheme() {
      return appInfo?.scheme;
    },
  };
});
framework.impl(ValidatorProvider, p => {
  const apis = p.get(DesktopApiService).api;
  return {
    async validate(_challenge, resource) {
      const token = await apis.handler.ui.getChallengeResponse(resource);
      if (!token) {
        throw new Error('Challenge failed');
      }
      return token;
    },
  };
});
const frameworkProvider = framework.provider();

// setup application lifecycle events, and emit application start event
window.addEventListener('focus', () => {
  frameworkProvider.get(LifecycleService).applicationFocus();
});
frameworkProvider.get(LifecycleService).applicationStart();
window.addEventListener('unload', () => {
  frameworkProvider
    .get(DesktopApiService)
    .api.handler.ui.pingAppLayoutReady(false)
    .catch(console.error);
});

events?.applicationMenu.openAboutPageInSettingModal(() =>
  frameworkProvider.get(WorkspaceDialogService).open('setting', {
    activeTab: 'about',
  })
);
events?.applicationMenu.onNewPageAction(() => {
  const currentWorkspaceId = frameworkProvider
    .get(GlobalContextService)
    .globalContext.workspaceId.get();
  const workspacesService = frameworkProvider.get(WorkspacesService);
  const workspaceRef = currentWorkspaceId
    ? workspacesService.openByWorkspaceId(currentWorkspaceId)
    : null;
  if (!workspaceRef) {
    return;
  }
  const { workspace, dispose } = workspaceRef;
  const editorSettingService = frameworkProvider.get(EditorSettingService);
  const docsService = workspace.scope.get(DocsService);
  const editorSetting = editorSettingService.editorSetting;

  const docProps = {
    note: editorSetting.get('affine:note'),
  };
  apis?.ui
    .isActiveTab()
    .then(isActive => {
      if (!isActive) {
        return;
      }
      const page = docsService.createDoc({ docProps });
      workspace.scope.get(WorkbenchService).workbench.openDoc(page.id);
    })
    .catch(err => {
      console.error(err);
    });

  dispose();
});

export function App() {
  return (
    <Suspense>
      <FrameworkRoot framework={frameworkProvider}>
        <CacheProvider value={cache}>
          <I18nProvider>
            <AffineContext store={getCurrentStore()}>
              <DesktopThemeSync />
              <RouterProvider
                fallbackElement={<AppContainer fallback />}
                router={router}
                future={future}
              />
              {environment.isWindows && (
                <div style={{ position: 'fixed', right: 0, top: 0, zIndex: 5 }}>
                  <WindowsAppControls />
                </div>
              )}
            </AffineContext>
          </I18nProvider>
        </CacheProvider>
      </FrameworkRoot>
    </Suspense>
  );
}

function createStoreManagerClient() {
  const { port1: portForOpClient, port2: portForWorker } = new MessageChannel();
  let portFromWorker: MessagePort | null = null;
  let portId = crypto.randomUUID();

  const handleMessage = (ev: MessageEvent) => {
    if (
      ev.data.type === 'electron:worker-connect' &&
      ev.data.portId === portId
    ) {
      portFromWorker = ev.ports[0];
      // connect portForWorker and portFromWorker
      portFromWorker.addEventListener('message', ev => {
        portForWorker.postMessage(ev.data, [...ev.ports]);
      });
      portForWorker.addEventListener('message', ev => {
        // oxlint-disable-next-line no-non-null-assertion
        portFromWorker!.postMessage(ev.data, [...ev.ports]);
      });
      portForWorker.start();
      portFromWorker.start();
    }
  };

  window.addEventListener('message', handleMessage);

  // oxlint-disable-next-line no-non-null-assertion
  apis!.worker.connectWorker('affine-shared-worker', portId).catch(err => {
    console.error('failed to connect worker', err);
  });

  const storeManager = new StoreManagerClient(new OpClient(portForOpClient));
  portForOpClient.start();
  return storeManager;
}
