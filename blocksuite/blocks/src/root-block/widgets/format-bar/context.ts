import { MenuContext } from '@blocksuite/affine-components/toolbar';
import {
  getBlockSelectionsCommand,
  getImageSelectionsCommand,
  getSelectedModelsCommand,
  getTextSelectionCommand,
} from '@blocksuite/affine-shared/commands';

import type { AffineFormatBarWidget } from './format-bar.js';

export class FormatBarContext extends MenuContext {
  get doc() {
    return this.toolbar.host.doc;
  }

  get host() {
    return this.toolbar.host;
  }

  get selectedBlockModels() {
    const [success, result] = this.std.command
      .chain()
      .tryAll(chain => [
        chain.pipe(getTextSelectionCommand),
        chain.pipe(getBlockSelectionsCommand),
        chain.pipe(getImageSelectionsCommand),
      ])
      .pipe(getSelectedModelsCommand, {
        mode: 'highest',
      })
      .run();

    if (!success) {
      return [];
    }

    // should return an empty array if `to` of the range is null
    if (
      result.currentTextSelection &&
      !result.currentTextSelection.to &&
      result.currentTextSelection.from.length === 0
    ) {
      return [];
    }

    if (result.selectedModels?.length) {
      return result.selectedModels;
    }

    return [];
  }

  get std() {
    return this.toolbar.std;
  }

  constructor(public toolbar: AffineFormatBarWidget) {
    super();
  }

  isEmpty() {
    return this.selectedBlockModels.length === 0;
  }

  isMultiple() {
    return this.selectedBlockModels.length > 1;
  }

  isSingle() {
    return this.selectedBlockModels.length === 1;
  }
}
