import { PageViewportService } from '@blocksuite/affine-shared/services';

import type { AffineDragHandleWidget } from '../drag-handle.js';

export class PageWatcher {
  get pageViewportService() {
    return this.widget.std.get(PageViewportService);
  }

  constructor(readonly widget: AffineDragHandleWidget) {}

  watch() {
    const { disposables } = this.widget;

    disposables.add(
      this.widget.doc.slots.blockUpdated.on(() => this.widget.hide())
    );

    disposables.add(
      this.pageViewportService.on(() => {
        this.widget.hide();
      })
    );
  }
}
