import { notify } from '@affine/component';
import { I18n } from '@affine/i18n';
import {
  init,
  reactRouterV6BrowserTracingIntegration,
  setTags,
} from '@sentry/react';
import { OnEvent, Service } from '@toeverything/infra';
import { debounce } from 'lodash-es';
import { useEffect } from 'react';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

import { AuthService, DefaultServerService, ServersService } from '../../cloud';
import { ApplicationStarted } from '../../lifecycle';
import type { DesktopApi } from '../entities/electron-api';

@OnEvent(ApplicationStarted, e => e.setupStartListener)
export class DesktopApiService extends Service {
  constructor(public readonly api: DesktopApi) {
    super();
    if (!api.handler || !api.events) {
      throw new Error('DesktopApi is not initialized');
    }
  }

  get appInfo() {
    return this.api.appInfo;
  }

  get handler() {
    return this.api.handler;
  }

  get events() {
    return this.api.events;
  }

  get sharedStorage() {
    return this.api.sharedStorage;
  }

  private setupStartListener() {
    this.setupSentry();
    this.setupCommonUIEvents();
    this.setupAuthRequestEvent();
  }

  private setupSentry() {
    if (
      BUILD_CONFIG.debug ||
      window.SENTRY_RELEASE ||
      this.api.appInfo.windowName !== 'main'
    ) {
      // https://docs.sentry.io/platforms/javascript/guides/electron/
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

      this.api.handler.ui
        .handleNetworkChange(navigator.onLine)
        .catch(console.error);
      window.addEventListener('offline', () => {
        this.api.handler.ui.handleNetworkChange(false).catch(console.error);
      });
      window.addEventListener('online', () => {
        this.api.handler.ui.handleNetworkChange(true).catch(console.error);
      });
    }
  }

  private setupCommonUIEvents() {
    if (this.api.appInfo.windowName !== 'main') {
      return;
    }

    const handleMaximized = (maximized: boolean | undefined) => {
      document.documentElement.dataset.maximized = String(maximized);
    };
    const handleFullscreen = (fullscreen: boolean | undefined) => {
      document.documentElement.dataset.fullscreen = String(fullscreen);
    };
    this.api.handler.ui
      .isMaximized()
      .then(handleMaximized)
      .catch(console.error);
    this.api.handler.ui
      .isFullScreen()
      .then(handleFullscreen)
      .catch(console.error);

    this.api.events.ui.onMaximized(handleMaximized);
    this.api.events.ui.onFullScreen(handleFullscreen);

    const tabId = this.api.appInfo.viewId;

    if (tabId) {
      let isActive = false;
      const handleActiveTabChange = (active: boolean) => {
        isActive = active;
        document.documentElement.dataset.active = String(active);
      };
      this.api.handler.ui
        .isActiveTab()
        .then(active => {
          handleActiveTabChange(active);
          this.api.events.ui.onActiveTabChanged(id => {
            handleActiveTabChange(id === tabId);
          });
        })
        .catch(console.error);

      const handleResize = debounce(() => {
        if (isActive) {
          this.api.handler.ui.handleWindowResize().catch(console.error);
        }
      }, 50);
      window.addEventListener('resize', handleResize);
      window.addEventListener('dragstart', () => {
        document.documentElement.dataset.dragging = 'true';
      });
      window.addEventListener('dragend', () => {
        document.documentElement.dataset.dragging = 'false';
      });
    }
  }

  private setupAuthRequestEvent() {
    this.events.ui.onAuthenticationRequest(({ method, payload, server }) => {
      (async () => {
        if (!(await this.api.handler.ui.isActiveTab())) {
          return;
        }

        // Dynamically get these services to avoid circular dependencies
        const serversService = this.framework.get(ServersService);
        const defaultServerService = this.framework.get(DefaultServerService);

        let targetServer;
        if (server) {
          targetServer = await serversService.addOrGetServerByBaseUrl(server);
        } else {
          targetServer = defaultServerService.server;
        }
        if (!targetServer) {
          throw new Error('Affine Cloud server not found');
        }
        const authService = targetServer.scope.get(AuthService);

        switch (method) {
          case 'magic-link': {
            const { email, token } = payload;
            await authService.signInMagicLink(email, token);
            break;
          }
          case 'oauth': {
            const { code, state, provider } = payload;
            await authService.signInOauth(code, state, provider);
            break;
          }
        }
      })().catch(e => {
        notify.error({
          title: I18n['com.affine.auth.toast.title.failed'](),
          message: (e as any).message,
        });
      });
    });
  }
}
