import type { FootNote } from '@blocksuite/affine-model';
import { unsafeCSSVarV2 } from '@blocksuite/affine-shared/theme';
import type { AffineTextAttributes } from '@blocksuite/affine-shared/types';
import {
  BlockSelection,
  type BlockStdScope,
  ShadowlessElement,
  TextSelection,
} from '@blocksuite/block-std';
import { WithDisposable } from '@blocksuite/global/utils';
import {
  type DeltaInsert,
  INLINE_ROOT_ATTR,
  type InlineRootElement,
  ZERO_WIDTH_NON_JOINER,
  ZERO_WIDTH_SPACE,
} from '@blocksuite/inline';
import { shift } from '@floating-ui/dom';
import { baseTheme } from '@toeverything/theme';
import { css, html, nothing, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ref } from 'lit-html/directives/ref.js';

import { HoverController } from '../../../../../hover/controller';
import type { FootNoteNodeConfigProvider } from './footnote-config';

export class AffineFootnoteNode extends WithDisposable(ShadowlessElement) {
  static override styles = css`
    .footnote-node {
      padding: 0 2px;
      user-select: none;
      cursor: pointer;
    }

    .footnote-content-default {
      display: inline-block;
      background: ${unsafeCSSVarV2('button/primary')};
      color: ${unsafeCSSVarV2('button/pureWhiteText')};
      width: 14px;
      height: 14px;
      line-height: 14px;
      font-size: 10px;
      font-weight: 400;
      border-radius: 50%;
      text-align: center;
      text-overflow: ellipsis;
      font-family: ${unsafeCSS(baseTheme.fontSansFamily)};
    }
  `;

  get customNodeRenderer() {
    return this.config?.customNodeRenderer;
  }

  get customPopupRenderer() {
    return this.config?.customPopupRenderer;
  }

  get interactive() {
    return this.config?.interactive;
  }

  get hidePopup() {
    return this.config?.hidePopup;
  }

  get inlineEditor() {
    const inlineRoot = this.closest<InlineRootElement<AffineTextAttributes>>(
      `[${INLINE_ROOT_ATTR}]`
    );
    return inlineRoot?.inlineEditor;
  }

  get selfInlineRange() {
    const selfInlineRange = this.inlineEditor?.getInlineRangeFromElement(this);
    return selfInlineRange;
  }

  private readonly _FootNoteDefaultContent = (footnote: FootNote) => {
    return html`<span class="footnote-content-default"
      >${footnote.label}</span
    >`;
  };

  private readonly _FootNotePopup = (
    footnote: FootNote,
    abortController: AbortController
  ) => {
    return this.customPopupRenderer
      ? this.customPopupRenderer(footnote, this.std, abortController)
      : html`<footnote-popup
          .footnote=${footnote}
          .std=${this.std}
          .abortController=${abortController}
        ></footnote-popup>`;
  };

  private readonly _whenHover: HoverController = new HoverController(
    this,
    ({ abortController }) => {
      const footnote = this.delta.attributes?.footnote;
      if (!footnote) return null;

      if (
        this.config?.hidePopup ||
        !this.selfInlineRange ||
        !this.inlineEditor
      ) {
        return null;
      }

      const selection = this.std?.selection;
      if (!selection) {
        return null;
      }
      const textSelection = selection.find(TextSelection);
      if (!!textSelection && !textSelection.isCollapsed()) {
        return null;
      }

      const blockSelections = selection.filter(BlockSelection);
      if (blockSelections.length) {
        return null;
      }

      return {
        template: this._FootNotePopup(footnote, abortController),
        container: this,
        computePosition: {
          referenceElement: this,
          placement: 'top',
          autoUpdate: true,
          middleware: [shift()],
        },
      };
    },
    { enterDelay: 500 }
  );

  override render() {
    const attributes = this.delta.attributes;
    const footnote = attributes?.footnote;
    if (!footnote) {
      return nothing;
    }

    const node = this.customNodeRenderer
      ? this.customNodeRenderer(footnote, this.std)
      : this._FootNoteDefaultContent(footnote);

    return html`<span
      ${this.hidePopup ? '' : ref(this._whenHover.setReference)}
      class="footnote-node"
      >${node}<v-text .str=${ZERO_WIDTH_NON_JOINER}></v-text
    ></span>`;
  }

  @property({ attribute: false })
  accessor config: FootNoteNodeConfigProvider | undefined = undefined;

  @property({ type: Object })
  accessor delta: DeltaInsert<AffineTextAttributes> = {
    insert: ZERO_WIDTH_SPACE,
    attributes: {},
  };

  @property({ attribute: false })
  accessor std!: BlockStdScope;
}
