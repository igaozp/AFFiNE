import { EdgelessLegacySlotIdentifier } from '@blocksuite/affine-block-surface';
import {
  blockComponentSymbol,
  type BlockService,
  type GfxBlockComponent,
  GfxElementSymbol,
  toGfxBlockComponent,
} from '@blocksuite/block-std';
import type {
  GfxBlockElementModel,
  GfxCompatibleProps,
} from '@blocksuite/block-std/gfx';
import { Bound } from '@blocksuite/global/utils';
import type { StyleInfo } from 'lit/directives/style-map.js';

import type { EmbedBlockComponent } from './embed-block-element.js';

export function toEdgelessEmbedBlock<
  Model extends GfxBlockElementModel<GfxCompatibleProps>,
  Service extends BlockService,
  WidgetName extends string,
  B extends typeof EmbedBlockComponent<Model, Service, WidgetName>,
>(block: B) {
  return class extends toGfxBlockComponent(block) {
    _isDragging = false;

    _isResizing = false;

    _isSelected = false;

    _showOverlay = false;

    override [blockComponentSymbol] = true;

    override blockDraggable = false;

    protected override embedContainerStyle: StyleInfo = {};

    override [GfxElementSymbol] = true;

    get bound(): Bound {
      return Bound.deserialize(this.model.xywh);
    }

    get rootService() {
      return this.std.getService('affine:page');
    }

    _handleClick(_: MouseEvent): void {
      return;
    }

    get edgelessSlots() {
      return this.std.get(EdgelessLegacySlotIdentifier);
    }

    override connectedCallback(): void {
      super.connectedCallback();

      this._disposables.add(
        this.edgelessSlots.elementResizeStart.on(() => {
          this._isResizing = true;
          this._showOverlay = true;
        })
      );

      this._disposables.add(
        this.edgelessSlots.elementResizeEnd.on(() => {
          this._isResizing = false;
          this._showOverlay =
            this._isResizing || this._isDragging || !this._isSelected;
        })
      );
    }

    override renderGfxBlock() {
      const bound = Bound.deserialize(this.model.xywh);

      this.embedContainerStyle.width = `${bound.w}px`;
      this.embedContainerStyle.height = `${bound.h}px`;
      this.blockContainerStyles = {
        width: `${bound.w}px`,
      };
      this._scale = bound.w / this._cardWidth;

      return this.renderPageContent();
    }

    protected override accessor blockContainerStyles: StyleInfo | undefined =
      undefined;
  } as B & {
    new (...args: any[]): GfxBlockComponent;
  };
}
