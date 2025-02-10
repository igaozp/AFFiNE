import {
  type EditorHost,
  ShadowlessElement,
} from '@blocksuite/affine/block-std';
import {
  SignalWatcher,
  throttle,
  WithDisposable,
} from '@blocksuite/affine/global/utils';
import { Signal } from '@preact/signals-core';
import { html, type PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';

import { extractMarkdownFromDoc } from '../../utils/extract';
import type { DocDisplayConfig } from '../chat-config';
import type { BaseChip, ChatChip, DocChip } from '../chat-context';
import { getChipIcon, getChipTooltip } from './utils';

const EXTRACT_DOC_THROTTLE = 1000;

export class ChatPanelDocChip extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  @property({ attribute: false })
  accessor chip!: DocChip;

  @property({ attribute: false })
  accessor updateChip!: (chip: ChatChip, options: Partial<BaseChip>) => void;

  @property({ attribute: false })
  accessor removeChip!: (chip: ChatChip) => void;

  @property({ attribute: false })
  accessor docDisplayConfig!: DocDisplayConfig;

  @property({ attribute: false })
  accessor host!: EditorHost;

  private chipName = new Signal<string>('');

  override connectedCallback() {
    super.connectedCallback();

    const { signal, cleanup } = this.docDisplayConfig.getTitle(this.chip.docId);
    this.chipName = signal;
    this.disposables.add(cleanup);

    const doc = this.docDisplayConfig.getDoc(this.chip.docId);
    if (doc) {
      this.disposables.add(
        doc.slots.blockUpdated.on(
          throttle(this.autoUpdateChip, EXTRACT_DOC_THROTTLE)
        )
      );
      this.autoUpdateChip();
    }
  }

  override updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (
      changedProperties.has('chip') &&
      changedProperties.get('chip')?.state === 'candidate' &&
      this.chip.state === 'embedding'
    ) {
      this.embedDocChip().catch(console.error);
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.disposables.dispose();
  }

  private readonly onChipClick = async () => {
    if (this.chip.state === 'candidate') {
      this.updateChip(this.chip, {
        state: 'embedding',
      });
    }
  };

  private readonly onChipDelete = () => {
    this.removeChip(this.chip);
  };

  private readonly autoUpdateChip = () => {
    if (this.chip.state !== 'candidate') {
      this.embedDocChip().catch(console.error);
    }
  };

  private readonly embedDocChip = async () => {
    try {
      const doc = this.docDisplayConfig.getDoc(this.chip.docId);
      if (!doc) {
        throw new Error('Document not found');
      }
      if (!doc.ready) {
        doc.load();
      }
      const result = await extractMarkdownFromDoc(doc, this.host.std.provider);
      if (this.chip.markdown) {
        this.chip.markdown.value = result.markdown;
      } else {
        this.chip.markdown = new Signal<string>(result.markdown);
      }
      this.updateChip(this.chip, {
        state: 'success',
      });
    } catch (e) {
      this.updateChip(this.chip, {
        state: 'failed',
        tooltip: e instanceof Error ? e.message : 'Failed to embed document',
      });
    }
  };

  override render() {
    const { state, docId } = this.chip;
    const isLoading = state === 'embedding' || state === 'uploading';
    const getIcon = this.docDisplayConfig.getIcon(docId);
    const docIcon = typeof getIcon === 'function' ? getIcon() : getIcon;
    const icon = getChipIcon(state, docIcon);
    const tooltip = getChipTooltip(
      state,
      this.chipName.value,
      this.chip.tooltip
    );

    return html`<chat-panel-chip
      .state=${state}
      .name=${this.chipName.value}
      .tooltip=${tooltip}
      .icon=${icon}
      .closeable=${!isLoading}
      .onChipClick=${this.onChipClick}
      .onChipDelete=${this.onChipDelete}
    ></chat-panel-chip>`;
  }
}
