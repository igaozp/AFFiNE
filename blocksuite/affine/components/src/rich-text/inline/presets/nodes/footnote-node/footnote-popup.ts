import { ColorScheme, type FootNote } from '@blocksuite/affine-model';
import {
  DocDisplayMetaProvider,
  LinkPreviewerService,
  ThemeProvider,
} from '@blocksuite/affine-shared/services';
import { unsafeCSSVar, unsafeCSSVarV2 } from '@blocksuite/affine-shared/theme';
import type { BlockStdScope } from '@blocksuite/block-std';
import { SignalWatcher, WithDisposable } from '@blocksuite/global/utils';
import { DualLinkIcon, LinkIcon } from '@blocksuite/icons/lit';
import { computed, signal } from '@preact/signals-core';
import { css, html, LitElement, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';

import {
  DarkLoadingIcon,
  getAttachmentFileIcon,
  LightLoadingIcon,
  WebIcon16,
} from '../../../../../icons';
import { RefNodeSlotsProvider } from '../../../../extension/ref-node-slots';

export class FootNotePopup extends SignalWatcher(WithDisposable(LitElement)) {
  static override styles = css`
    .footnote-popup-container {
      border-radius: 4px;
      box-shadow: ${unsafeCSSVar('overlayPanelShadow')};
      border-radius: 4px;
      background-color: ${unsafeCSSVarV2('layer/background/primary')};
      border: 0.5px solid ${unsafeCSSVarV2('layer/insideBorder/border')};
    }
  `;

  private readonly _isLoading$ = signal(false);

  private readonly _linkPreview$ = signal<
    { favicon: string | undefined; title?: string } | undefined
  >({ favicon: undefined, title: undefined });

  private readonly _prefixIcon$ = computed(() => {
    const referenceType = this.footnote.reference.type;
    if (referenceType === 'doc') {
      const docId = this.footnote.reference.docId;
      if (!docId) {
        return undefined;
      }
      return this.std.get(DocDisplayMetaProvider).icon(docId).value;
    } else if (referenceType === 'attachment') {
      const fileType = this.footnote.reference.fileType;
      if (!fileType) {
        return undefined;
      }
      return getAttachmentFileIcon(fileType);
    } else if (referenceType === 'url') {
      if (this._isLoading$.value) {
        return this._LoadingIcon();
      }

      const favicon = this._linkPreview$.value?.favicon;
      if (!favicon) {
        return undefined;
      }

      const titleIconType =
        favicon.split('.').pop() === 'svg'
          ? 'svg+xml'
          : favicon.split('.').pop();
      const titleIcon = html`<object
        type="image/${titleIconType}"
        data=${favicon}
        draggable="false"
      >
        ${WebIcon16}
      </object>`;
      return titleIcon;
    }
    return undefined;
  });

  private readonly _suffixIcon = (): TemplateResult | undefined => {
    const referenceType = this.footnote.reference.type;
    if (referenceType === 'doc') {
      return DualLinkIcon({ width: '16px', height: '16px' });
    } else if (referenceType === 'url') {
      return LinkIcon({ width: '16px', height: '16px' });
    }
    return undefined;
  };

  private readonly _popupLabel$ = computed(() => {
    const referenceType = this.footnote.reference.type;
    let label = '';
    const { docId, fileName, url } = this.footnote.reference;
    switch (referenceType) {
      case 'doc':
        if (!docId) {
          return label;
        }
        label = this.std.get(DocDisplayMetaProvider).title(docId).value;
        break;
      case 'attachment':
        if (!fileName) {
          return label;
        }
        label = fileName;
        break;
      case 'url':
        if (!url) {
          return label;
        }
        label = this._linkPreview$.value?.title ?? url;
        break;
    }
    return label;
  });

  private readonly _tooltip$ = computed(() => {
    const referenceType = this.footnote.reference.type;
    if (referenceType === 'url') {
      return this.footnote.reference.url ?? '';
    }
    return this._popupLabel$.value;
  });

  private readonly _LoadingIcon = () => {
    const theme = this.std.get(ThemeProvider).theme;
    return theme === ColorScheme.Light ? LightLoadingIcon : DarkLoadingIcon;
  };

  /**
   * When clicking the chip, we will navigate to the reference doc or open the url
   */
  private readonly _onChipClick = () => {
    const referenceType = this.footnote.reference.type;
    const { docId, url } = this.footnote.reference;
    switch (referenceType) {
      case 'doc': {
        if (!docId) {
          break;
        }
        this.std
          .getOptional(RefNodeSlotsProvider)
          ?.docLinkClicked.emit({ pageId: docId, host: this.std.host });
        break;
      }
      case 'url':
        if (!url) {
          break;
        }
        window.open(url, '_blank');
        break;
    }
    this.abortController.abort();
  };

  override connectedCallback() {
    super.connectedCallback();
    if (this.footnote.reference.type === 'url' && this.footnote.reference.url) {
      this._isLoading$.value = true;
      this.std.store
        .get(LinkPreviewerService)
        .query(this.footnote.reference.url)
        .then(data => {
          this._linkPreview$.value = {
            favicon: data.icon ?? undefined,
            title: data.title ?? undefined,
          };
        })
        .catch(console.error)
        .finally(() => {
          this._isLoading$.value = false;
        });
    }
  }

  override render() {
    return html`
      <div class="footnote-popup-container">
        <footnote-popup-chip
          .prefixIcon=${this._prefixIcon$.value}
          .label=${this._popupLabel$.value}
          .suffixIcon=${this._suffixIcon()}
          .onClick=${this._onChipClick}
          .tooltip=${this._tooltip$.value}
        ></footnote-popup-chip>
      </div>
    `;
  }

  @property({ attribute: false })
  accessor footnote!: FootNote;

  @property({ attribute: false })
  accessor std!: BlockStdScope;

  @property({ attribute: false })
  accessor abortController!: AbortController;
}
