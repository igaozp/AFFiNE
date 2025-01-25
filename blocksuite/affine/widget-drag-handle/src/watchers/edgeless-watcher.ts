import {
  EdgelessLegacySlotIdentifier,
  type SurfaceBlockComponent,
} from '@blocksuite/affine-block-surface';
import {
  getSelectedRect,
  isTopLevelBlock,
} from '@blocksuite/affine-shared/utils';
import {
  GfxControllerIdentifier,
  type GfxToolsFullOptionValue,
} from '@blocksuite/block-std/gfx';
import { type IVec, Rect } from '@blocksuite/global/utils';
import { effect } from '@preact/signals-core';

import {
  DRAG_HANDLE_CONTAINER_OFFSET_LEFT_TOP_LEVEL,
  DRAG_HANDLE_CONTAINER_WIDTH_TOP_LEVEL,
  DRAG_HANDLE_GRABBER_BORDER_RADIUS,
  DRAG_HANDLE_GRABBER_WIDTH_HOVERED,
  HOVER_AREA_RECT_PADDING_TOP_LEVEL,
} from '../config.js';
import type { AffineDragHandleWidget } from '../drag-handle.js';

export class EdgelessWatcher {
  private readonly _handleEdgelessToolUpdated = (
    newTool: GfxToolsFullOptionValue
  ) => {
    // @ts-expect-error FIXME: resolve after gfx tool refactor
    if (newTool.type === 'default') {
      this.checkTopLevelBlockSelection();
    } else {
      this.widget.hide();
    }
  };

  private readonly _handleEdgelessViewPortUpdated = ({
    zoom,
    center,
  }: {
    zoom: number;
    center: IVec;
  }) => {
    if (this.widget.scale.peek() !== zoom) {
      this.widget.scale.value = zoom;
    }

    if (
      this.widget.center[0] !== center[0] &&
      this.widget.center[1] !== center[1]
    ) {
      this.widget.center = [...center];
    }

    if (this.widget.isTopLevelDragHandleVisible) {
      this._showDragHandleOnTopLevelBlocks().catch(console.error);
      this._updateDragHoverRectTopLevelBlock();
    } else {
      this.widget.hide();
    }
  };

  private readonly _showDragHandleOnTopLevelBlocks = async () => {
    if (this.widget.mode === 'page') return;

    const surfaceModel = this.widget.doc.getBlockByFlavour('affine:surface');
    const surface = this.widget.std.view.getBlock(
      surfaceModel[0]!.id
    ) as SurfaceBlockComponent;
    await surface.updateComplete;

    if (!this.widget.anchorBlockId) return;

    const container = this.widget.dragHandleContainer;
    const grabber = this.widget.dragHandleGrabber;
    if (!container || !grabber) return;

    const area = this.hoverAreaTopLevelBlock;
    if (!area) return;

    const height = area.height;

    const posLeft = area.left;

    const posTop = (area.top += area.padding);

    container.style.transition = 'none';
    container.style.paddingTop = `0px`;
    container.style.paddingBottom = `0px`;
    container.style.width = `${area.containerWidth}px`;
    container.style.left = `${posLeft}px`;
    container.style.top = `${posTop}px`;
    container.style.display = 'flex';
    container.style.height = `${height}px`;

    grabber.style.width = `${DRAG_HANDLE_GRABBER_WIDTH_HOVERED * this.widget.scale.peek()}px`;
    grabber.style.borderRadius = `${
      DRAG_HANDLE_GRABBER_BORDER_RADIUS * this.widget.scale.peek()
    }px`;

    this.widget.handleAnchorModelDisposables();

    this.widget.isTopLevelDragHandleVisible = true;
  };

  private readonly _updateDragHoverRectTopLevelBlock = () => {
    if (!this.widget.dragHoverRect) return;

    this.widget.dragHoverRect = this.hoverAreaRectTopLevelBlock;
  };

  checkTopLevelBlockSelection = () => {
    if (!this.widget.isConnected) return;

    if (this.widget.doc.readonly || this.widget.mode === 'page') {
      this.widget.hide();
      return;
    }

    const { std } = this.widget;
    const gfx = std.get(GfxControllerIdentifier);
    const { selection } = gfx;
    const editing = selection.editing;
    const selectedElements = selection.selectedElements;
    if (editing || selectedElements.length !== 1) {
      this.widget.hide();
      return;
    }

    const selectedElement = selectedElements[0];
    if (!isTopLevelBlock(selectedElement)) {
      this.widget.hide();
      return;
    }

    this.widget.anchorBlockId.value = selectedElement.id;

    this._showDragHandleOnTopLevelBlocks().catch(console.error);
  };

  get hoverAreaRectTopLevelBlock() {
    const area = this.hoverAreaTopLevelBlock;
    if (!area) return null;

    return new Rect(area.left, area.top, area.right, area.bottom);
  }

  get hoverAreaTopLevelBlock() {
    const edgelessElement = this.widget.anchorEdgelessElement.peek();

    if (!edgelessElement) return null;

    const { std } = this.widget;
    const gfx = std.get(GfxControllerIdentifier);
    const { viewport } = gfx;
    const rect = getSelectedRect([edgelessElement]);
    let [left, top] = viewport.toViewCoord(rect.left, rect.top);
    const scale = this.widget.scale.peek();
    const width = rect.width * scale;
    const height = rect.height * scale;

    let [right, bottom] = [left + width, top + height];

    const padding = HOVER_AREA_RECT_PADDING_TOP_LEVEL * scale;

    const containerWidth = DRAG_HANDLE_CONTAINER_WIDTH_TOP_LEVEL * scale;
    const offsetLeft = DRAG_HANDLE_CONTAINER_OFFSET_LEFT_TOP_LEVEL * scale;

    left -= containerWidth + offsetLeft;
    top -= padding;
    right += padding;
    bottom += padding;

    return {
      left,
      top,
      right,
      bottom,
      width,
      height,
      padding,
      containerWidth,
    };
  }

  constructor(readonly widget: AffineDragHandleWidget) {}

  watch() {
    const { disposables, std } = this.widget;
    const gfx = std.get(GfxControllerIdentifier);
    const { viewport, selection, tool } = gfx;
    const edgelessSlots = std.get(EdgelessLegacySlotIdentifier);

    disposables.add(
      viewport.viewportUpdated.on(this._handleEdgelessViewPortUpdated)
    );

    disposables.add(
      selection.slots.updated.on(() => {
        this.checkTopLevelBlockSelection();
      })
    );

    disposables.add(
      effect(() => {
        const value = tool.currentToolOption$.value;

        value && this._handleEdgelessToolUpdated(value);
      })
    );

    disposables.add(
      edgelessSlots.readonlyUpdated.on(() => {
        this.checkTopLevelBlockSelection();
      })
    );

    disposables.add(
      edgelessSlots.elementResizeStart.on(() => {
        this.widget.hide();
      })
    );

    disposables.add(
      edgelessSlots.elementResizeEnd.on(() => {
        this.checkTopLevelBlockSelection();
      })
    );
  }
}
