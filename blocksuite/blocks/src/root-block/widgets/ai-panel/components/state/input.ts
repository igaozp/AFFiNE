import { AIStarIcon } from '@blocksuite/affine-components/icons';
import { unsafeCSSVarV2 } from '@blocksuite/affine-shared/theme';
import { stopPropagation } from '@blocksuite/affine-shared/utils';
import { SignalWatcher, WithDisposable } from '@blocksuite/global/utils';
import { PublishIcon, SendIcon } from '@blocksuite/icons/lit';
import { css, html, LitElement, nothing } from 'lit';
import { property, query, state } from 'lit/decorators.js';

import type { AINetworkSearchConfig } from '../../type';

export class AIPanelInput extends SignalWatcher(WithDisposable(LitElement)) {
  static override styles = css`
    :host {
      width: 100%;
      padding: 0 12px;
      box-sizing: border-box;
    }

    .root {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      background: var(--affine-background-overlay-panel-color);
    }

    .star {
      display: flex;
      padding: 2px;
      align-items: center;
    }

    .textarea-container {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      flex: 1 0 0;

      textarea {
        flex: 1 0 0;
        border: none;
        outline: none;
        -webkit-box-shadow: none;
        -moz-box-shadow: none;
        box-shadow: none;
        background-color: transparent;
        resize: none;
        overflow: hidden;
        padding: 0px;

        color: var(--affine-text-primary-color);

        /* light/sm */
        font-family: var(--affine-font-family);
        font-size: var(--affine-font-sm);
        font-style: normal;
        font-weight: 400;
        line-height: 22px; /* 157.143% */
      }

      textarea::placeholder {
        color: var(--affine-placeholder-color);
      }

      textarea::-moz-placeholder {
        color: var(--affine-placeholder-color);
      }
    }

    .arrow {
      display: flex;
      align-items: center;
      padding: 2px;
      gap: 4px;
      border-radius: 4px;
      background: ${unsafeCSSVarV2('icon/disable')};
      svg {
        width: 20px;
        height: 20px;
        color: ${unsafeCSSVarV2('button/pureWhiteText')};
      }
    }
    .arrow[data-active] {
      background: ${unsafeCSSVarV2('icon/activated')};
    }
    .arrow[data-active]:hover {
      cursor: pointer;
    }
    .network {
      display: flex;
      align-items: center;
      padding: 2px;
      gap: 4px;
      cursor: pointer;
      svg {
        width: 20px;
        height: 20px;
        color: ${unsafeCSSVarV2('icon/primary')};
      }
    }
    .network[data-active='true'] svg {
      color: ${unsafeCSSVarV2('icon/activated')};
    }
  `;

  private readonly _onInput = () => {
    this.textarea.style.height = 'auto';
    this.textarea.style.height = this.textarea.scrollHeight + 'px';

    this.onInput?.(this.textarea.value);
    const value = this.textarea.value.trim();
    if (value.length > 0) {
      this._arrow.dataset.active = '';
      this._hasContent = true;
    } else {
      delete this._arrow.dataset.active;
      this._hasContent = false;
    }
  };

  private readonly _onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      this._sendToAI(e);
    }
  };

  private readonly _sendToAI = (e: MouseEvent | KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const value = this.textarea.value.trim();
    if (value.length === 0) return;

    this.onFinish?.(value);
    this.remove();
  };

  private readonly _toggleNetworkSearch = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const enable = this.networkSearchConfig.enabled.value;
    this.networkSearchConfig.setEnabled(!enable);
  };

  override render() {
    return html`<div class="root">
      <div class="star">${AIStarIcon}</div>
      <div class="textarea-container">
        <textarea
          placeholder="What are your thoughts?"
          rows="1"
          @keydown=${this._onKeyDown}
          @input=${this._onInput}
          @pointerdown=${stopPropagation}
          @click=${stopPropagation}
          @dblclick=${stopPropagation}
          @cut=${stopPropagation}
          @copy=${stopPropagation}
          @paste=${stopPropagation}
          @keyup=${stopPropagation}
        ></textarea>
        ${this.networkSearchConfig.visible.value
          ? html`
              <div
                class="network"
                data-active=${!!this.networkSearchConfig.enabled.value}
                @click=${this._toggleNetworkSearch}
                @pointerdown=${stopPropagation}
              >
                ${PublishIcon()}
                <affine-tooltip .offset=${12}
                  >Toggle Network Search</affine-tooltip
                >
              </div>
            `
          : nothing}
        <div
          class="arrow"
          @click=${this._sendToAI}
          @pointerdown=${stopPropagation}
        >
          ${SendIcon()}
          ${this._hasContent
            ? html`<affine-tooltip .offset=${12}>Send to AI</affine-tooltip>`
            : nothing}
        </div>
      </div>
    </div>`;
  }

  override updated(_changedProperties: Map<PropertyKey, unknown>): void {
    const result = super.updated(_changedProperties);
    this.textarea.style.height = this.textarea.scrollHeight + 'px';
    return result;
  }

  @query('.arrow')
  private accessor _arrow!: HTMLDivElement;

  @state()
  private accessor _hasContent = false;

  @property({ attribute: false })
  accessor networkSearchConfig!: AINetworkSearchConfig;

  @property({ attribute: false })
  accessor onFinish: ((input: string) => void) | undefined = undefined;

  @property({ attribute: false })
  accessor onInput: ((input: string) => void) | undefined = undefined;

  @query('textarea')
  accessor textarea!: HTMLTextAreaElement;
}

declare global {
  interface HTMLElementTagNameMap {
    'ai-panel-input': AIPanelInput;
  }
}
