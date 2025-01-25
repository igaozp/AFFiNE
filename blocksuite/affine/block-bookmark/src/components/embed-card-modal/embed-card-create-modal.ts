import { EdgelessCRUDIdentifier } from '@blocksuite/affine-block-surface';
import { toast } from '@blocksuite/affine-components/toast';
import type { EmbedCardStyle } from '@blocksuite/affine-model';
import {
  EMBED_CARD_HEIGHT,
  EMBED_CARD_WIDTH,
} from '@blocksuite/affine-shared/consts';
import { EmbedOptionProvider } from '@blocksuite/affine-shared/services';
import { isValidUrl, stopPropagation } from '@blocksuite/affine-shared/utils';
import type { EditorHost } from '@blocksuite/block-std';
import { ShadowlessElement } from '@blocksuite/block-std';
import { GfxControllerIdentifier } from '@blocksuite/block-std/gfx';
import { Bound, Vec, WithDisposable } from '@blocksuite/global/utils';
import type { BlockModel } from '@blocksuite/store';
import { html } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import { embedCardModalStyles } from './styles.js';

export class EmbedCardCreateModal extends WithDisposable(ShadowlessElement) {
  static override styles = embedCardModalStyles;

  private readonly _onCancel = () => {
    this.remove();
  };

  private readonly _onConfirm = () => {
    const url = this.input.value;

    if (!isValidUrl(url)) {
      toast(this.host, 'Invalid link');
      return;
    }

    const embedOptions = this.host.std
      .get(EmbedOptionProvider)
      .getEmbedBlockOptions(url);

    const { mode } = this.createOptions;
    if (mode === 'page') {
      const { parentModel, index } = this.createOptions;
      let flavour = 'affine:bookmark';

      if (embedOptions) {
        flavour = embedOptions.flavour;
      }

      this.host.doc.addBlock(
        flavour as never,
        {
          url,
        },
        parentModel,
        index
      );
    } else if (mode === 'edgeless') {
      let flavour = 'affine:bookmark',
        targetStyle: EmbedCardStyle = 'vertical';

      if (embedOptions) {
        flavour = embedOptions.flavour;
        targetStyle = embedOptions.styles[0];
      }

      const gfx = this.host.std.get(GfxControllerIdentifier);
      const crud = this.host.std.get(EdgelessCRUDIdentifier);

      const viewport = gfx.viewport;
      const surfaceModel = gfx.surface;
      if (!surfaceModel) {
        return;
      }

      const center = Vec.toVec(viewport.center);
      crud.addBlock(
        flavour,
        {
          url,
          xywh: Bound.fromCenter(
            center,
            EMBED_CARD_WIDTH[targetStyle],
            EMBED_CARD_HEIGHT[targetStyle]
          ).serialize(),
          style: targetStyle,
        },
        surfaceModel
      );

      gfx.tool.setTool(
        // @ts-expect-error FIXME: resolve after gfx tool refactor
        'default'
      );
    }
    this.onConfirm();
    this.remove();
  };

  private readonly _onDocumentKeydown = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.isComposing) {
      this._onConfirm();
    }
    if (e.key === 'Escape') {
      this.remove();
    }
  };

  private _handleInput(e: InputEvent) {
    const target = e.target as HTMLInputElement;
    this._linkInputValue = target.value;
  }

  override connectedCallback() {
    super.connectedCallback();

    this.updateComplete
      .then(() => {
        requestAnimationFrame(() => {
          this.input.focus();
        });
      })
      .catch(console.error);
    this.disposables.addFromEvent(this, 'keydown', this._onDocumentKeydown);
    this.disposables.addFromEvent(this, 'cup', stopPropagation);
    this.disposables.addFromEvent(this, 'copy', stopPropagation);
    this.disposables.addFromEvent(this, 'paste', stopPropagation);
  }

  override render() {
    return html`<div class="embed-card-modal">
      <div class="embed-card-modal-mask" @click=${this._onCancel}></div>
      <div class="embed-card-modal-wrapper">
        <div class="embed-card-modal-row">
          <div class="embed-card-modal-title">${this.titleText}</div>
        </div>

        <div class="embed-card-modal-row">
          <div class="embed-card-modal-description">
            ${this.descriptionText}
          </div>
        </div>

        <div class="embed-card-modal-row">
          <input
            class="embed-card-modal-input link"
            id="card-description"
            type="text"
            placeholder="Input in https://..."
            value=${this._linkInputValue}
            @input=${this._handleInput}
          />
        </div>

        <div class="embed-card-modal-row">
          <button
            class=${classMap({
              'embed-card-modal-button': true,
              save: true,
            })}
            ?disabled=${!isValidUrl(this._linkInputValue)}
            @click=${this._onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>`;
  }

  @state()
  private accessor _linkInputValue = '';

  @property({ attribute: false })
  accessor createOptions!:
    | {
        mode: 'page';
        parentModel: BlockModel | string;
        index?: number;
      }
    | {
        mode: 'edgeless';
      };

  @property({ attribute: false })
  accessor descriptionText!: string;

  @property({ attribute: false })
  accessor host!: EditorHost;

  @query('input')
  accessor input!: HTMLInputElement;

  @property({ attribute: false })
  accessor onConfirm!: () => void;

  @property({ attribute: false })
  accessor titleText!: string;
}

export async function toggleEmbedCardCreateModal(
  host: EditorHost,
  titleText: string,
  descriptionText: string,
  createOptions:
    | {
        mode: 'page';
        parentModel: BlockModel | string;
        index?: number;
      }
    | {
        mode: 'edgeless';
      }
): Promise<void> {
  host.selection.clear();

  const embedCardCreateModal = new EmbedCardCreateModal();
  embedCardCreateModal.host = host;
  embedCardCreateModal.titleText = titleText;
  embedCardCreateModal.descriptionText = descriptionText;
  embedCardCreateModal.createOptions = createOptions;

  document.body.append(embedCardCreateModal);

  return new Promise(resolve => {
    embedCardCreateModal.onConfirm = () => resolve();
  });
}

declare global {
  interface HTMLElementTagNameMap {
    'embed-card-create-modal': EmbedCardCreateModal;
  }
}
