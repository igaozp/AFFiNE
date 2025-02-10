import { EdgelessLegacySlotIdentifier } from '@blocksuite/affine-block-surface';
import type { DocTitle } from '@blocksuite/affine-components/doc-title';
import { MoreIndicatorIcon } from '@blocksuite/affine-components/icons';
import { NoteDisplayMode } from '@blocksuite/affine-model';
import { EDGELESS_BLOCK_CHILD_PADDING } from '@blocksuite/affine-shared/consts';
import { stopPropagation } from '@blocksuite/affine-shared/utils';
import { toGfxBlockComponent } from '@blocksuite/block-std';
import { Bound } from '@blocksuite/global/utils';
import { html, nothing } from 'lit';
import { query, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { styleMap } from 'lit/directives/style-map.js';

import { NoteBlockComponent } from './note-block';
import { ACTIVE_NOTE_EXTRA_PADDING } from './note-edgeless-block.css';
import * as styles from './note-edgeless-block.css';
import { isPageBlock } from './utils';

export const AFFINE_EDGELESS_NOTE = 'affine-edgeless-note';

export class EdgelessNoteBlockComponent extends toGfxBlockComponent(
  NoteBlockComponent
) {
  private get _isShowCollapsedContent() {
    return (
      this.model.edgeless.collapse &&
      this.gfx.selection.has(this.model.id) &&
      (this._isResizing || this._isHover)
    );
  }

  get _zoom() {
    return this.gfx.viewport.zoom;
  }

  get rootService() {
    return this.std.getService('affine:page');
  }

  private _collapsedContent() {
    if (!this._isShowCollapsedContent) {
      return nothing;
    }

    const { xywh, edgeless } = this.model;
    const { borderSize } = edgeless.style;

    const extraPadding = this._editing ? ACTIVE_NOTE_EXTRA_PADDING : 0;
    const extraBorder = this._editing ? borderSize : 0;
    const bound = Bound.deserialize(xywh);
    const scale = edgeless.scale ?? 1;
    const width = bound.w / scale + extraPadding * 2 + extraBorder;
    const height = bound.h / scale;

    const rect = this._notePageContent?.getBoundingClientRect();
    if (!rect) return nothing;

    const zoom = this.gfx.viewport.zoom;
    this._noteFullHeight =
      rect.height / scale / zoom + 2 * EDGELESS_BLOCK_CHILD_PADDING;

    if (height >= this._noteFullHeight) {
      return nothing;
    }

    return html`
      <div
        class=${styles.collapsedContent}
        style=${styleMap({
          width: `${width}px`,
          height: `${this._noteFullHeight - height}px`,
          left: `${-(extraPadding + extraBorder / 2)}px`,
          top: `${height + extraPadding + extraBorder / 2}px`,
        })}
      ></div>
    `;
  }

  private _handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowUp') {
      this._docTitle?.inlineEditor?.focusEnd();
    }
  }

  private _hovered() {
    if (
      this.selection.value.some(
        sel => sel.type === 'surface' && sel.blockId === this.model.id
      )
    ) {
      this._isHover = true;
    }
  }

  private _leaved() {
    if (this._isHover) {
      this._isHover = false;
    }
  }

  private _setCollapse(event: MouseEvent) {
    event.stopImmediatePropagation();

    const { collapse, collapsedHeight } = this.model.edgeless;

    if (collapse) {
      this.model.doc.updateBlock(this.model, () => {
        this.model.edgeless.collapse = false;
      });
    } else if (collapsedHeight) {
      const { xywh, edgeless } = this.model;
      const bound = Bound.deserialize(xywh);
      bound.h = collapsedHeight * (edgeless.scale ?? 1);
      this.model.doc.updateBlock(this.model, () => {
        this.model.edgeless.collapse = true;
        this.model.xywh = bound.serialize();
      });
    }

    this.selection.clear();
  }

  override connectedCallback(): void {
    super.connectedCallback();

    const selection = this.gfx.selection;

    this._editing = selection.has(this.model.id) && selection.editing;
    this._disposables.add(
      selection.slots.updated.on(() => {
        if (selection.has(this.model.id) && selection.editing) {
          this._editing = true;
        } else {
          this._editing = false;
        }
      })
    );

    this.disposables.addFromEvent(this, 'keydown', this._handleKeyDown);
  }

  get edgelessSlots() {
    return this.std.get(EdgelessLegacySlotIdentifier);
  }

  override firstUpdated() {
    const { _disposables } = this;
    const selection = this.gfx.selection;

    _disposables.add(
      this.edgelessSlots.elementResizeStart.on(() => {
        if (selection.selectedElements.includes(this.model)) {
          this._isResizing = true;
        }
      })
    );

    _disposables.add(
      this.edgelessSlots.elementResizeEnd.on(() => {
        this._isResizing = false;
      })
    );

    const observer = new MutationObserver(() => {
      const rect = this._notePageContent?.getBoundingClientRect();
      if (!rect) return;
      const zoom = this.gfx.viewport.zoom;
      const scale = this.model.edgeless.scale ?? 1;
      this._noteFullHeight =
        rect.height / scale / zoom + 2 * EDGELESS_BLOCK_CHILD_PADDING;
    });
    if (this._notePageContent) {
      observer.observe(this, { childList: true, subtree: true });
      _disposables.add(() => observer.disconnect());
    }
  }

  override getRenderingRect() {
    const { xywh, edgeless } = this.model;
    const { collapse, scale = 1 } = edgeless;

    const bound = Bound.deserialize(xywh);
    const width = bound.w / scale;
    const height = bound.h / scale;

    return {
      x: bound.x,
      y: bound.y,
      w: width,
      h: collapse ? height : 'inherit',
      zIndex: this.toZIndex(),
    };
  }

  override renderGfxBlock() {
    const { model } = this;
    const { displayMode } = model;
    if (!!displayMode && displayMode === NoteDisplayMode.DocOnly)
      return nothing;

    const { xywh, edgeless } = model;
    const { borderRadius } = edgeless.style;
    const { collapse = false, collapsedHeight, scale = 1 } = edgeless;

    const bound = Bound.deserialize(xywh);
    const height = bound.h / scale;

    const style = {
      borderRadius: borderRadius + 'px',
      transform: `scale(${scale})`,
    };

    const extra = this._editing ? ACTIVE_NOTE_EXTRA_PADDING : 0;

    const isCollapsable =
      collapse != null &&
      collapsedHeight != null &&
      collapsedHeight !== this._noteFullHeight;

    const isCollapseArrowUp = collapse
      ? this._noteFullHeight < height
      : !!collapsedHeight && collapsedHeight < height;

    return html`
      <div
        class=${styles.edgelessNoteContainer}
        style=${styleMap(style)}
        data-model-height="${bound.h}"
        data-editing=${this._editing}
        data-collapse=${ifDefined(collapse)}
        data-testid="edgeless-note-container"
        @mouseleave=${this._leaved}
        @mousemove=${this._hovered}
        data-scale="${scale}"
      >
        <edgeless-note-background
          .editing=${this._editing}
          .note=${this.model}
        ></edgeless-note-background>

        <edgeless-page-block-title
          .note=${this.model}
        ></edgeless-page-block-title>

        <div
          class="edgeless-note-page-content"
          style=${styleMap({
            width: '100%',
            height: '100%',
            'overflow-y': this._isShowCollapsedContent ? 'initial' : 'clip',
          })}
        >
          ${this.renderPageContent()}
        </div>

        <edgeless-note-mask
          .model=${this.model}
          .host=${this.host}
          .zoom=${this.gfx.viewport.zoom ?? 1}
          .editing=${this._editing}
        ></edgeless-note-mask>

        ${isCollapsable && !isPageBlock(this.std, this.model)
          ? html`<div
              class="${classMap({
                [styles.collapseButton]: true,
                flip: isCollapseArrowUp,
              })}"
              style=${styleMap({
                bottom: this._editing ? `${-extra}px` : '0',
              })}
              data-testid="edgeless-note-collapse-button"
              @mousedown=${stopPropagation}
              @mouseup=${stopPropagation}
              @click=${this._setCollapse}
            >
              ${MoreIndicatorIcon}
            </div>`
          : nothing}
        ${this._collapsedContent()}
      </div>
    `;
  }

  @state()
  private accessor _editing = false;

  @state()
  private accessor _isHover = false;

  @state()
  private accessor _isResizing = false;

  @state()
  private accessor _noteFullHeight = 0;

  @query('.edgeless-note-page-content .affine-note-block-container')
  private accessor _notePageContent: HTMLElement | null = null;

  @query('doc-title')
  private accessor _docTitle: DocTitle | null = null;
}

declare global {
  interface HTMLElementTagNameMap {
    [AFFINE_EDGELESS_NOTE]: EdgelessNoteBlockComponent;
  }
}
