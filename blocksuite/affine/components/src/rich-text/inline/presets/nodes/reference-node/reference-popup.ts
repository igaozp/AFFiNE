import type { ReferenceInfo } from '@blocksuite/affine-model';
import {
  FeatureFlagService,
  GenerateDocUrlProvider,
  type LinkEventType,
  OpenDocExtensionIdentifier,
  type OpenDocMode,
  type TelemetryEvent,
  TelemetryProvider,
} from '@blocksuite/affine-shared/services';
import {
  cloneReferenceInfoWithoutAliases,
  isInsideBlockByFlavour,
} from '@blocksuite/affine-shared/utils';
import {
  BLOCK_ID_ATTR,
  type BlockComponent,
  type BlockStdScope,
} from '@blocksuite/block-std';
import { assertExists, WithDisposable } from '@blocksuite/global/utils';
import type { InlineRange } from '@blocksuite/inline';
import { computePosition, inline, offset, shift } from '@floating-ui/dom';
import { effect } from '@preact/signals-core';
import { html, LitElement, nothing } from 'lit';
import { property, query } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { join } from 'lit/directives/join.js';
import { repeat } from 'lit/directives/repeat.js';

import {
  CopyIcon,
  DeleteIcon,
  EditIcon,
  MoreVerticalIcon,
  OpenIcon,
  SmallArrowDownIcon,
} from '../../../../../icons/index.js';
import { notifyLinkedDocSwitchedToEmbed } from '../../../../../notification/index.js';
import { isPeekable, peek } from '../../../../../peek/index.js';
import { toast } from '../../../../../toast/toast.js';
import {
  type MenuItem,
  renderActions,
  renderToolbarSeparator,
} from '../../../../../toolbar/index.js';
import { RefNodeSlotsProvider } from '../../../../extension/index.js';
import type { AffineInlineEditor } from '../../affine-inline-specs.js';
import { ReferenceAliasPopup } from './reference-alias-popup.js';
import { styles } from './styles.js';
import type { DocLinkClickedEvent } from './types.js';

export class ReferencePopup extends WithDisposable(LitElement) {
  static override styles = styles;

  private readonly _copyLink = () => {
    const url = this.std
      .getOptional(GenerateDocUrlProvider)
      ?.generateDocUrl(this.referenceInfo.pageId, this.referenceInfo.params);

    if (url) {
      navigator.clipboard.writeText(url).catch(console.error);
      toast(this.std.host, 'Copied link to clipboard');
    }

    this.abortController.abort();

    track(this.std, 'CopiedLink', { control: 'copy link' });
  };

  private readonly _openDoc = (event?: Partial<DocLinkClickedEvent>) => {
    this.std.getOptional(RefNodeSlotsProvider)?.docLinkClicked.emit({
      ...this.referenceInfo,
      ...event,
      host: this.std.host,
    });
  };

  private readonly _openEditPopup = (e: MouseEvent) => {
    e.stopPropagation();

    if (document.body.querySelector('reference-alias-popup')) {
      return;
    }

    const {
      std,
      docTitle,
      referenceInfo,
      inlineEditor,
      targetInlineRange,
      abortController,
    } = this;

    const aliasPopup = new ReferenceAliasPopup();

    aliasPopup.std = std;
    aliasPopup.docTitle = docTitle;
    aliasPopup.referenceInfo = referenceInfo;
    aliasPopup.inlineEditor = inlineEditor;
    aliasPopup.inlineRange = targetInlineRange;

    document.body.append(aliasPopup);

    abortController.abort();

    track(std, 'OpenedAliasPopup', { control: 'edit' });
  };

  private readonly _toggleViewSelector = (e: Event) => {
    const opened = (e as CustomEvent<boolean>).detail;
    if (!opened) return;

    track(this.std, 'OpenedViewSelector', { control: 'switch view' });
  };

  private readonly _trackViewSelected = (type: string) => {
    track(this.std, 'SelectedView', {
      control: 'select view',
      type: `${type} view`,
    });
  };

  get _embedViewButtonDisabled() {
    if (
      this.block.doc.readonly ||
      isInsideBlockByFlavour(
        this.block.doc,
        this.block.model,
        'affine:edgeless-text'
      )
    ) {
      return true;
    }
    return (
      !!this.block.closest('affine-embed-synced-doc-block') ||
      this.referenceDocId === this.doc.id
    );
  }

  _openButtonDisabled(openMode?: OpenDocMode) {
    if (openMode === 'open-in-active-view') {
      return this.referenceDocId === this.doc.id;
    }
    return false;
  }

  get block() {
    const block = this.inlineEditor.rootElement?.closest<BlockComponent>(
      `[${BLOCK_ID_ATTR}]`
    );
    assertExists(block);
    return block;
  }

  get doc() {
    const doc = this.block.doc;
    assertExists(doc);
    return doc;
  }

  get referenceDocId() {
    const docId = this.inlineEditor.getFormat(this.targetInlineRange).reference
      ?.pageId;
    assertExists(docId);
    return docId;
  }

  get std() {
    const std = this.block.std;
    assertExists(std);
    return std;
  }

  private _convertToCardView() {
    const block = this.block;
    const doc = block.host.doc;
    const parent = doc.getParent(block.model);
    assertExists(parent);

    const index = parent.children.indexOf(block.model);

    doc.addBlock(
      'affine:embed-linked-doc',
      this.referenceInfo,
      parent,
      index + 1
    );

    const totalTextLength = this.inlineEditor.yTextLength;
    const inlineTextLength = this.targetInlineRange.length;
    if (totalTextLength === inlineTextLength) {
      doc.deleteBlock(block.model);
    } else {
      this.inlineEditor.insertText(this.targetInlineRange, this.docTitle);
    }

    this.abortController.abort();
  }

  private _convertToEmbedView() {
    const block = this.block;
    const std = block.std;
    const doc = block.host.doc;
    const parent = doc.getParent(block.model);
    assertExists(parent);

    const index = parent.children.indexOf(block.model);
    const referenceInfo = this.referenceInfo;
    const hasTitleAlias = Boolean(referenceInfo.title);

    doc.addBlock(
      'affine:embed-synced-doc',
      cloneReferenceInfoWithoutAliases(referenceInfo),
      parent,
      index + 1
    );

    const totalTextLength = this.inlineEditor.yTextLength;
    const inlineTextLength = this.targetInlineRange.length;
    if (totalTextLength === inlineTextLength) {
      doc.deleteBlock(block.model);
    } else {
      this.inlineEditor.insertText(this.targetInlineRange, this.docTitle);
    }

    if (hasTitleAlias) {
      notifyLinkedDocSwitchedToEmbed(std);
    }

    this.abortController.abort();
  }

  private _delete() {
    if (this.inlineEditor.isValidInlineRange(this.targetInlineRange)) {
      this.inlineEditor.deleteText(this.targetInlineRange);
    }
    this.abortController.abort();
  }

  private _moreActions() {
    return renderActions([
      [
        {
          type: 'delete',
          label: 'Delete',
          icon: DeleteIcon,
          disabled: this.doc.readonly,
          action: () => this._delete(),
        },
      ],
    ]);
  }

  private _openMenuButton() {
    const openDocConfig = this.std.get(OpenDocExtensionIdentifier);

    const buttons: MenuItem[] = openDocConfig.items
      .map(item => {
        if (
          (item.type === 'open-in-center-peek' && !isPeekable(this.target)) ||
          !openDocConfig?.isAllowed(item.type)
        ) {
          return null;
        }
        return {
          label: item.label,
          type: item.type,
          icon: item.icon,
          action: () => {
            if (item.type === 'open-in-center-peek') {
              peek(this.target);
            } else {
              this._openDoc({ openMode: item.type });
            }
          },
          disabled: this._openButtonDisabled(item.type),
          when: () => {
            if (item.type === 'open-in-center-peek') {
              return isPeekable(this.target);
            }
            return openDocConfig?.isAllowed(item.type) ?? true;
          },
        };
      })
      .filter(item => item !== null);

    if (buttons.length === 0) {
      return nothing;
    }

    return html`
      <editor-menu-button
        .contentPadding=${'8px'}
        .button=${html`
          <editor-icon-button
            aria-label="Open doc"
            .justify=${'space-between'}
            .labelHeight=${'20px'}
          >
            ${OpenIcon}${SmallArrowDownIcon}
          </editor-icon-button>
        `}
      >
        <div data-size="large" data-orientation="vertical">
          ${repeat(
            buttons,
            button => button.label,
            ({ label, icon, action, disabled }) => html`
              <editor-menu-action
                aria-label=${ifDefined(label)}
                ?disabled=${disabled}
                @click=${action}
              >
                ${icon}<span class="label">${label}</span>
              </editor-menu-action>
            `
          )}
        </div>
      </editor-menu-button>
    `;
  }

  private _viewSelector() {
    // synced doc entry controlled by flag
    const isSyncedDocEnabled = this.doc
      .get(FeatureFlagService)
      .getFlag('enable_synced_doc_block');
    const buttons = [];

    buttons.push({
      type: 'inline',
      label: 'Inline view',
    });

    buttons.push({
      type: 'card',
      label: 'Card view',
      action: () => this._convertToCardView(),
      disabled: this.doc.readonly,
    });

    if (isSyncedDocEnabled) {
      buttons.push({
        type: 'embed',
        label: 'Embed view',
        action: () => this._convertToEmbedView(),
        disabled:
          this.doc.readonly ||
          this.isLinkedNode ||
          this._embedViewButtonDisabled,
      });
    }

    return html`
      <editor-menu-button
        .contentPadding=${'8px'}
        .button=${html`
          <editor-icon-button
            aria-label="Switch view"
            .justify=${'space-between'}
            .labelHeight=${'20px'}
            .iconContainerWidth=${'110px'}
          >
            <span class="label">Inline view</span>
            ${SmallArrowDownIcon}
          </editor-icon-button>
        `}
        @toggle=${this._toggleViewSelector}
      >
        <div data-size="small" data-orientation="vertical">
          ${repeat(
            buttons,
            button => button.type,
            ({ type, label, action, disabled }) => html`
              <editor-menu-action
                aria-label=${label}
                data-testid=${`link-to-${type}`}
                ?data-selected=${type === 'inline'}
                ?disabled=${disabled || type === 'inline'}
                @click=${() => {
                  action?.();
                  this._trackViewSelected(type);
                }}
              >
                ${label}
              </editor-menu-action>
            `
          )}
        </div>
      </editor-menu-button>
    `;
  }

  override connectedCallback() {
    super.connectedCallback();

    if (this.targetInlineRange.length === 0) {
      return;
    }

    const parent = this.block.host.doc.getParent(this.block.model);
    assertExists(parent);

    this.disposables.add(
      effect(() => {
        const children = parent.children;
        if (children.includes(this.block.model)) return;
        this.abortController.abort();
      })
    );
  }

  override render() {
    const titleButton = this.referenceInfo.title
      ? html`
          <editor-icon-button
            class="doc-title"
            aria-label="Doc title"
            .hover=${false}
            .labelHeight=${'20px'}
            .tooltip=${this.docTitle}
            @click=${this._openDoc}
          >
            <span class="label">${this.docTitle}</span>
          </editor-icon-button>
        `
      : nothing;

    const buttons = [
      this._openMenuButton(),

      html`
        ${titleButton}

        <editor-icon-button
          aria-label="Copy link"
          data-testid="copy-link"
          .tooltip=${'Copy link'}
          @click=${this._copyLink}
        >
          ${CopyIcon}
        </editor-icon-button>

        <editor-icon-button
          aria-label="Edit"
          data-testid="edit"
          .tooltip=${'Edit'}
          ?disabled=${this.doc.readonly}
          @click=${this._openEditPopup}
        >
          ${EditIcon}
        </editor-icon-button>
      `,

      this._viewSelector(),

      html`
        <editor-menu-button
          .contentPadding=${'8px'}
          .button=${html`
            <editor-icon-button aria-label="More" .tooltip=${'More'}>
              ${MoreVerticalIcon}
            </editor-icon-button>
          `}
        >
          <div data-size="large" data-orientation="vertical">
            ${this._moreActions()}
          </div>
        </editor-menu-button>
      `,
    ];

    return html`
      <div class="overlay-root">
        <div class="affine-reference-popover-container">
          <editor-toolbar class="affine-reference-popover view">
            ${join(
              buttons.filter(button => button !== nothing),
              renderToolbarSeparator
            )}
          </editor-toolbar>
        </div>
      </div>
    `;
  }

  override updated() {
    assertExists(this.popupContainer);
    const range = this.inlineEditor.toDomRange(this.targetInlineRange);
    assertExists(range);

    const visualElement = {
      getBoundingClientRect: () => range.getBoundingClientRect(),
      getClientRects: () => range.getClientRects(),
    };
    computePosition(visualElement, this.popupContainer, {
      middleware: [
        offset(10),
        inline(),
        shift({
          padding: 6,
        }),
      ],
    })
      .then(({ x, y }) => {
        const popupContainer = this.popupContainer;
        if (!popupContainer) return;
        popupContainer.style.left = `${x}px`;
        popupContainer.style.top = `${y}px`;
      })
      .catch(console.error);
  }

  @property({ attribute: false })
  accessor abortController!: AbortController;

  @property({ attribute: false })
  accessor docTitle!: string;

  @property({ attribute: false })
  accessor inlineEditor!: AffineInlineEditor;

  @property({ attribute: false })
  accessor isLinkedNode!: boolean;

  @query('.affine-reference-popover-container')
  accessor popupContainer!: HTMLDivElement;

  @property({ type: Object })
  accessor referenceInfo!: ReferenceInfo;

  @property({ attribute: false })
  accessor target!: LitElement;

  @property({ attribute: false })
  accessor targetInlineRange!: InlineRange;
}

export function toggleReferencePopup(
  target: LitElement,
  isLinkedNode: boolean,
  referenceInfo: ReferenceInfo,
  inlineEditor: AffineInlineEditor,
  targetInlineRange: InlineRange,
  docTitle: string,
  abortController: AbortController
): ReferencePopup {
  const popup = new ReferencePopup();
  popup.target = target;
  popup.isLinkedNode = isLinkedNode;
  popup.referenceInfo = referenceInfo;
  popup.inlineEditor = inlineEditor;
  popup.targetInlineRange = targetInlineRange;
  popup.docTitle = docTitle;
  popup.abortController = abortController;

  document.body.append(popup);

  return popup;
}

function track(
  std: BlockStdScope,
  event: LinkEventType,
  props: Partial<TelemetryEvent>
) {
  std.getOptional(TelemetryProvider)?.track(event, {
    segment: 'toolbar',
    page: 'doc editor',
    module: 'reference toolbar',
    type: 'inline view',
    category: 'linked doc',
    ...props,
  });
}
