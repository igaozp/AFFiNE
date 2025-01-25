import './setup';
import '@affine/component/theme';
import '@affine/core/mobile/styles/mobile.css';

import { bindNativeDBApis } from '@affine/nbstore/sqlite';
import {
  init,
  reactRouterV6BrowserTracingIntegration,
  setTags,
} from '@sentry/react';
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

import { App } from './app';
import { NbStoreNativeDBApis } from './plugins/nbstore';

bindNativeDBApis(NbStoreNativeDBApis);

// TODO(@L-Sun) Uncomment this when the `show` method implement by `@capacitor/keyboard` in ios
// import './virtual-keyboard';

function main() {
  if (BUILD_CONFIG.debug || window.SENTRY_RELEASE) {
    // https://docs.sentry.io/platforms/javascript/guides/react/#configure
    init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.BUILD_TYPE ?? 'development',
      integrations: [
        reactRouterV6BrowserTracingIntegration({
          useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes,
        }),
      ],
    });
    setTags({
      appVersion: BUILD_CONFIG.appVersion,
      editorVersion: BUILD_CONFIG.editorVersion,
    });
  }
  mountApp();
}

function mountApp() {
  // oxlint-disable-next-line @typescript-eslint/no-non-null-assertion
  const root = document.getElementById('app')!;
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

try {
  main();
} catch (err) {
  console.error('Failed to bootstrap app', err);
}
