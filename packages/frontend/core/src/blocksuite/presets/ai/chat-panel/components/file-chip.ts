import { ShadowlessElement } from '@blocksuite/affine/block-std';
import { getAttachmentFileIcon } from '@blocksuite/affine/blocks';
import { SignalWatcher, WithDisposable } from '@blocksuite/affine/global/utils';
import { html } from 'lit';
import { property } from 'lit/decorators.js';

import type { FileChip } from '../chat-context';
import { getChipIcon, getChipTooltip } from './utils';

export class ChatPanelFileChip extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  @property({ attribute: false })
  accessor chip!: FileChip;

  override render() {
    const { state, fileName, fileType } = this.chip;
    const isLoading = state === 'embedding' || state === 'uploading';
    const tooltip = getChipTooltip(state, fileName, this.chip.tooltip);
    const fileIcon = getAttachmentFileIcon(fileType);
    const icon = getChipIcon(state, fileIcon);

    return html`<chat-panel-chip
      .state=${state}
      .name=${fileName}
      .tooltip=${tooltip}
      .icon=${icon}
      .closeable=${!isLoading}
    ></chat-panel-chip>`;
  }
}
