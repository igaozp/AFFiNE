import { ShadowlessElement } from '@blocksuite/affine/block-std';
import { SignalWatcher, WithDisposable } from '@blocksuite/affine/global/utils';
import { CloseIcon } from '@blocksuite/icons/lit';
import { css, html, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';

import type { ChipState } from '../chat-context';

export class ChatPanelChip extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  static override styles = css`
    .chip-card {
      display: flex;
      height: 24px;
      align-items: center;
      justify-content: center;
      margin: 4px;
      padding: 0 4px;
      border-radius: 4px;
      border: 1px solid var(--affine-border-color);
      background: var(--affine-background-primary-color);
      box-sizing: border-box;
    }
    .chip-card[data-state='candidate'] {
      border-width: 0.5px;
      border-style: dashed;
      background: var(--affine-background-secondary-color);
    }
    .chip-card[data-state='failed'] {
      color: var(--affine-error-color);
      background: var(--affine-background-error-color);
    }
    .chip-card[data-state='failed'] svg {
      color: var(--affine-error-color);
    }
    .chip-card svg {
      width: 16px;
      height: 16px;
      color: var(--affine-v2-icon-primary);
    }
    .chip-card-title {
      display: inline-block;
      margin: 0 4px;
      font-size: 12px;
      min-width: 16px;
      max-width: 124px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .chip-card[data-state='candidate'] .chip-card-title {
      cursor: pointer;
    }
    .chip-card-close {
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border-radius: 4px;
    }
    .chip-card-close:hover {
      background: var(--affine-hover-color);
    }
  `;

  @property({ attribute: false })
  accessor state!: ChipState;

  @property({ attribute: false })
  accessor name!: string;

  @property({ attribute: false })
  accessor tooltip!: string;

  @property({ attribute: false })
  accessor icon!: TemplateResult<1>;

  @property({ attribute: false })
  accessor closeable: boolean = false;

  @property({ attribute: false })
  accessor onChipDelete: () => void = () => {};

  @property({ attribute: false })
  accessor onChipClick: () => void = () => {};

  override render() {
    return html`
      <div
        class="chip-card"
        data-testid="chat-panel-chip"
        data-state=${this.state}
      >
        ${this.icon}
        <span class="chip-card-title" @click=${this.onChipClick}>
          <affine-tooltip>${this.tooltip}</affine-tooltip>
          <span data-testid="chat-panel-chip-title">${this.name}</span>
        </span>
        ${this.closeable
          ? html`
              <div class="chip-card-close" @click=${this.onChipDelete}>
                ${CloseIcon()}
              </div>
            `
          : ''}
      </div>
    `;
  }
}
