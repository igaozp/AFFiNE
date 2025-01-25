import { AffineContext } from '@affine/core/components/context';
import { AppFallback } from '@affine/core/mobile/components/app-fallback';
import { configureMobileModules } from '@affine/core/mobile/modules';
import { router } from '@affine/core/mobile/router';
import { configureCommonModules } from '@affine/core/modules';
import { I18nProvider } from '@affine/core/modules/i18n';
import { LifecycleService } from '@affine/core/modules/lifecycle';
import {
  configureLocalStorageStateStorageImpls,
  NbstoreProvider,
} from '@affine/core/modules/storage';
import { configureBrowserWorkbenchModule } from '@affine/core/modules/workbench';
import { configureBrowserWorkspaceFlavours } from '@affine/core/modules/workspace-engine';
import { WorkerClient } from '@affine/nbstore/worker/client';
import { Framework, FrameworkRoot, getCurrentStore } from '@toeverything/infra';
import { OpClient } from '@toeverything/infra/op';
import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';

const future = {
  v7_startTransition: true,
} as const;

const framework = new Framework();
configureCommonModules(framework);
configureBrowserWorkbenchModule(framework);
configureLocalStorageStateStorageImpls(framework);
configureBrowserWorkspaceFlavours(framework);
configureMobileModules(framework);
framework.impl(NbstoreProvider, {
  openStore(_key, options) {
    const worker = new Worker(
      new URL(/* webpackChunkName: "nbstore" */ './nbstore.ts', import.meta.url)
    );
    const client = new WorkerClient(new OpClient(worker), options);
    return {
      store: client,
      dispose: () => {
        worker.terminate();
      },
    };
  },
});
const frameworkProvider = framework.provider();

// setup application lifecycle events, and emit application start event
window.addEventListener('focus', () => {
  frameworkProvider.get(LifecycleService).applicationFocus();
});
frameworkProvider.get(LifecycleService).applicationStart();

export function App() {
  return (
    <Suspense>
      <FrameworkRoot framework={frameworkProvider}>
        <I18nProvider>
          <AffineContext store={getCurrentStore()}>
            <RouterProvider
              fallbackElement={<AppFallback />}
              router={router}
              future={future}
            />
          </AffineContext>
        </I18nProvider>
      </FrameworkRoot>
    </Suspense>
  );
}
