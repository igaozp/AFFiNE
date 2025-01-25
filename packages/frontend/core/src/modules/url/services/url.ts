import { Service } from '@toeverything/infra';

import type { ClientSchemeProvider } from '../providers/client-schema';
import type { PopupWindowProvider } from '../providers/popup-window';

export class UrlService extends Service {
  constructor(
    // those providers are optional, because they are not always available in some environments
    private readonly popupWindowProvider?: PopupWindowProvider,
    private readonly clientSchemeProvider?: ClientSchemeProvider
  ) {
    super();
  }

  getClientScheme() {
    return this.clientSchemeProvider?.getClientScheme();
  }

  /**
   * open a popup window, provide different implementations in different environments.
   * e.g. in electron, use system default browser to open a popup window.
   *
   * @param url only full url with http/https protocol is supported
   */
  openPopupWindow(url: string) {
    if (!url.startsWith('http')) {
      throw new Error('only full url with http/https protocol is supported');
    }
    this.popupWindowProvider?.open(url);
  }
}
