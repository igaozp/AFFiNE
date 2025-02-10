import { ShadowlessElement } from '@blocksuite/affine/block-std';
import {
  type LinkedMenuGroup,
  scrollbarStyle,
} from '@blocksuite/affine/blocks';
import { SignalWatcher, WithDisposable } from '@blocksuite/affine/global/utils';
import { SearchIcon } from '@blocksuite/icons/lit';
import type { DocMeta } from '@blocksuite/store';
import { css, html } from 'lit';
import { property, state } from 'lit/decorators.js';

import type { DocSearchMenuConfig } from '../chat-config';
import type { ChatChip } from '../chat-context';

export class ChatPanelAddPopover extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  static override styles = css`
    .add-popover {
      width: 280px;
      max-height: 240px;
      overflow-y: auto;
      border: 0.5px solid var(--affine-border-color);
      border-radius: 4px;
      background: var(--affine-background-primary-color);
      box-shadow: var(--affine-shadow-2);
      padding: 8px;
    }
    .add-popover icon-button {
      justify-content: flex-start;
      gap: 8px;
    }
    .add-popover icon-button svg {
      width: 20px;
      height: 20px;
    }
    .add-popover .divider {
      border-top: 0.5px solid var(--affine-border-color);
      margin: 8px 0;
    }
    .search-input-wrapper {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px;
    }
    .search-input-wrapper input {
      border: none;
      line-height: 20px;
      height: 20px;
      font-size: var(--affine-font-sm);
      color: var(--affine-text-primary-color);
      flex-grow: 1;
    }
    .search-input-wrapper input::placeholder {
      color: var(--affine-placeholder-color);
    }
    .search-input-wrapper input:focus {
      outline: none;
    }
    .search-input-wrapper svg {
      width: 20px;
      height: 20px;
      color: var(--affine-v2-icon-primary);
    }
    .no-result {
      padding: 4px;
      font-size: var(--affine-font-sm);
      color: var(--affine-text-secondary-color);
    }

    ${scrollbarStyle('.add-popover')}
  `;

  @state()
  private accessor _query = '';

  @state()
  private accessor _docGroup: LinkedMenuGroup = {
    name: 'No Result',
    items: [],
  };

  @state()
  private accessor _activatedItemIndex = 0;

  @property({ attribute: false })
  accessor docSearchMenuConfig!: DocSearchMenuConfig;

  @property({ attribute: false })
  accessor addChip!: (chip: ChatChip) => void;

  @property({ attribute: false })
  accessor abortController!: AbortController;

  override connectedCallback() {
    super.connectedCallback();
    this._updateDocGroup();
  }

  override render() {
    const items = Array.isArray(this._docGroup.items)
      ? this._docGroup.items
      : this._docGroup.items.value;
    return html`<div class="add-popover">
      <div class="search-input-wrapper">
        ${SearchIcon()}
        <input
          class="search-input"
          type="text"
          placeholder="Search Doc"
          .value=${this._query}
          @input=${this._onInput}
        />
      </div>
      <div class="divider"></div>
      <div class="search-group" style=${this._docGroup.styles ?? ''}>
        ${items.length > 0
          ? items.map(({ key, name, icon, action }, curIdx) => {
              return html`<icon-button
                width="280px"
                height="30px"
                data-id=${key}
                .text=${name}
                hover=${this._activatedItemIndex === curIdx}
                @click=${() => action()?.catch(console.error)}
                @mousemove=${() => (this._activatedItemIndex = curIdx)}
              >
                ${icon}
              </icon-button>`;
            })
          : html`<div class="no-result">No Result</div>`}
      </div>
    </div>`;
  }

  private _onInput(event: Event) {
    this._query = (event.target as HTMLInputElement).value;
    this._updateDocGroup();
  }

  private _updateDocGroup() {
    this._docGroup = this.docSearchMenuConfig.getDocMenuGroup(
      this._query,
      this._addDocChip,
      this.abortController.signal
    );
  }

  private readonly _addDocChip = (meta: DocMeta) => {
    this.addChip({
      docId: meta.id,
      state: 'embedding',
    });
    this.abortController.abort();
  };
}
