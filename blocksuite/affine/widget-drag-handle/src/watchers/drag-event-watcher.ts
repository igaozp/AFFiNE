import { ParagraphBlockComponent } from '@blocksuite/affine-block-paragraph';
import {
  addNoteAtPoint,
  getSurfaceBlock,
} from '@blocksuite/affine-block-surface';
import type { EmbedCardStyle, NoteBlockModel } from '@blocksuite/affine-model';
import {
  BLOCK_CHILDREN_CONTAINER_PADDING_LEFT,
  EMBED_CARD_HEIGHT,
  EMBED_CARD_WIDTH,
} from '@blocksuite/affine-shared/consts';
import {
  DocModeProvider,
  TelemetryProvider,
} from '@blocksuite/affine-shared/services';
import {
  captureEventTarget,
  type DropTarget as DropResult,
  getBlockComponentsExcludeSubtrees,
  getRectByBlockComponent,
  getScrollContainer,
  matchFlavours,
} from '@blocksuite/affine-shared/utils';
import {
  type BlockComponent,
  BlockSelection,
  type BlockStdScope,
  type DragFromBlockSuite,
  type DragPayload,
  type DropPayload,
  isGfxBlockComponent,
} from '@blocksuite/block-std';
import { GfxControllerIdentifier } from '@blocksuite/block-std/gfx';
import { Bound, last, Point, Rect } from '@blocksuite/global/utils';
import { Slice, type SliceSnapshot } from '@blocksuite/store';

import { DropIndicator } from '../components/drop-indicator.js';
import type { AffineDragHandleWidget } from '../drag-handle.js';
import { PreviewHelper } from '../helpers/preview-helper.js';
import { newIdCrossDoc } from '../middleware/new-id-cross-doc.js';
import { reorderList } from '../middleware/reorder-list';
import { surfaceRefToEmbed } from '../middleware/surface-ref-to-embed.js';
import {
  containBlock,
  extractIdsFromSnapshot,
  getParentNoteBlock,
  includeTextSelection,
  isOutOfNoteBlock,
} from '../utils.js';

export type DragBlockEntity = {
  type: 'blocks';
  snapshot?: SliceSnapshot;
  modelIds: string[];
};

export type DragBlockPayload = DragPayload<DragBlockEntity, DragFromBlockSuite>;

declare module '@blocksuite/block-std' {
  interface DNDEntity {
    blocks: DragBlockPayload;
  }
}
export class DragEventWatcher {
  dropIndicator: null | DropIndicator = null;

  previewHelper = new PreviewHelper(this.widget);

  get host() {
    return this.widget.host;
  }

  get mode() {
    return this.widget.mode;
  }

  get std() {
    return this.widget.std;
  }

  private get _gfx() {
    return this.widget.std.get(GfxControllerIdentifier);
  }

  private readonly _computeEdgelessBound = (
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    const border = 2;
    const noteScale = this.widget.noteScale.peek();
    const { viewport } = this._gfx;
    const { left: viewportLeft, top: viewportTop } = viewport;
    const currentViewBound = new Bound(
      x - viewportLeft,
      y - viewportTop,
      width + border / noteScale,
      height + border / noteScale
    );
    const currentModelBound = viewport.toModelBound(currentViewBound);
    return new Bound(
      currentModelBound.x,
      currentModelBound.y,
      width * noteScale,
      height * noteScale
    );
  };

  private readonly _createDropIndicator = () => {
    if (!this.dropIndicator) {
      this.dropIndicator = new DropIndicator();
      this.widget.ownerDocument.body.append(this.dropIndicator);
    }
  };

  private readonly _clearDropIndicator = () => {
    if (this.dropIndicator) {
      this.dropIndicator.remove();
      this.dropIndicator = null;
    }
  };

  private readonly _cleanup = () => {
    this._clearDropIndicator();
    this.widget.hide(true);
    this.std.selection.setGroup('gfx', []);
  };

  private readonly _onDragMove = (
    point: Point,
    payload: DragBlockPayload,
    dropPayload: DropPayload,
    block: BlockComponent
  ) => {
    this._createDropIndicator();
    this._updateDropIndicator(point, payload, dropPayload, block);
  };

  /**
   * When dragging, should update indicator position and target drop block id
   */
  private readonly _getDropResult = (
    dropBlock: BlockComponent,
    dragPayload: DragBlockPayload,
    dropPayload: DropPayload
  ): DropResult | null => {
    const model = dropBlock.model;

    const snapshot = dragPayload?.bsEntity?.snapshot;
    if (
      !snapshot ||
      snapshot.content.length === 0 ||
      !dragPayload?.from ||
      matchFlavours(model, ['affine:database'])
    )
      return null;

    const isDropOnNoteBlock = matchFlavours(model, ['affine:note']);

    const edge = dropPayload.edge;
    const scale = this.widget.scale.peek();
    let result: DropResult;

    if (edge === 'right' && matchFlavours(dropBlock.model, ['affine:list'])) {
      const domRect = getRectByBlockComponent(dropBlock);
      const placement = 'in';
      const rect = Rect.fromLWTH(
        domRect.left + BLOCK_CHILDREN_CONTAINER_PADDING_LEFT,
        domRect.width - BLOCK_CHILDREN_CONTAINER_PADDING_LEFT,
        domRect.top + domRect.height,
        3 * scale
      );

      result = {
        placement,
        rect,
        modelState: {
          model: dropBlock.model,
          rect: domRect,
          element: dropBlock,
        },
      };
    } else {
      const placement =
        isDropOnNoteBlock &&
        this.widget.doc.schema.safeValidate(
          snapshot.content[0].flavour,
          'affine:note'
        )
          ? 'in'
          : edge === 'top'
            ? 'before'
            : 'after';
      const domRect = getRectByBlockComponent(dropBlock);
      const y =
        placement === 'after'
          ? domRect.top + domRect.height
          : domRect.top - 3 * scale;

      result = {
        placement,
        rect: Rect.fromLWTH(domRect.left, domRect.width, y, 3 * scale),
        modelState: {
          model,
          rect: domRect,
          element: dropBlock,
        },
      };
    }

    return result;
  };

  private readonly _updateDropIndicator = (
    point: Point,
    dragPayload: DragBlockPayload,
    dropPayload: DropPayload,
    dropBlock: BlockComponent
  ) => {
    const closestNoteBlock = dropBlock && getParentNoteBlock(dropBlock);

    if (
      !closestNoteBlock ||
      isOutOfNoteBlock(
        this.host,
        closestNoteBlock,
        point,
        this.widget.scale.peek()
      )
    ) {
      this._resetDropResult();
    } else {
      const dropResult = this._getDropResult(
        dropBlock,
        dragPayload,
        dropPayload
      );
      this._updateDropResult(dropResult);
    }
  };

  private readonly _resetDropResult = () => {
    if (this.dropIndicator) this.dropIndicator.rect = null;
  };

  private readonly _updateDropResult = (dropResult: DropResult | null) => {
    if (!this.dropIndicator) return;

    if (dropResult?.rect) {
      const { left, top, width, height } = dropResult.rect;
      const rect = Rect.fromLWTH(left, width, top, height);

      this.dropIndicator.rect = rect;
    } else {
      this.dropIndicator.rect = dropResult?.rect ?? null;
    }
  };

  private readonly _getDraggedBlock = (draggedBlock: BlockComponent) => {
    return this._selectAndSetDraggingBlock(draggedBlock);
  };

  private readonly _selectAndSetDraggingBlock = (
    hoveredBlock: BlockComponent
  ) => {
    this.std.selection.setGroup('note', [
      this.std.selection.create(BlockSelection, {
        blockId: hoveredBlock.blockId,
      }),
    ]);

    return {
      models: [hoveredBlock.model],
      snapshot: this._toSnapshot([hoveredBlock]),
    };
  };

  private readonly _getSnapshotFromHoveredBlocks = () => {
    const hoverBlock = this.widget.anchorBlockComponent.peek()!;
    const isInSurface = isGfxBlockComponent(hoverBlock);

    if (isInSurface) {
      return {
        models: [hoverBlock.model],
        snapshot: this._toSnapshot([hoverBlock]),
      };
    }

    let selections = this.widget.selectionHelper.selectedBlocks;

    // When current selection is TextSelection
    // Should set BlockSelection for the blocks in native range
    if (selections.length > 0 && includeTextSelection(selections)) {
      const nativeSelection = document.getSelection();
      const rangeManager = this.std.range;

      if (nativeSelection && nativeSelection.rangeCount > 0 && rangeManager) {
        const range = nativeSelection.getRangeAt(0);
        const blocks = rangeManager.getSelectedBlockComponentsByRange(range, {
          match: el => el.model.role === 'content',
          mode: 'highest',
        });
        this.widget.selectionHelper.setSelectedBlocks(blocks);
        selections = this.widget.selectionHelper.selectedBlocks;
      }
    }

    // When there is no selected blocks
    // Or selected blocks not including current hover block
    // Set current hover block as selected
    if (
      selections.length === 0 ||
      !containBlock(
        selections.map(selection => selection.blockId),
        this.widget.anchorBlockId.peek()!
      )
    ) {
      this.widget.selectionHelper.setSelectedBlocks([hoverBlock]);
    }

    const collapsedBlock: BlockComponent[] = [];
    const blocks = this.widget.selectionHelper.selectedBlockComponents.flatMap(
      block => {
        // filter out collapsed siblings
        if (collapsedBlock.includes(block)) return [];

        // if block is toggled heading, should select all siblings
        if (
          block instanceof ParagraphBlockComponent &&
          block.model.type.startsWith('h') &&
          block.model.collapsed
        ) {
          const collapsedSiblings = block.collapsedSiblings.flatMap(
            sibling => this.widget.host.view.getBlock(sibling.id) ?? []
          );
          collapsedBlock.push(...collapsedSiblings);
          return [block, ...collapsedSiblings];
        }
        return [block];
      }
    );

    // This could be skipped if we can ensure that all selected blocks are on the same level
    // Which means not selecting parent block and child block at the same time
    const blocksExcludingChildren = getBlockComponentsExcludeSubtrees(
      blocks
    ) as BlockComponent[];

    return {
      models: blocksExcludingChildren.map(block => block.model),
      snapshot: this._toSnapshot(blocksExcludingChildren),
    };
  };

  private readonly _onDrop = (
    dropBlock: BlockComponent,
    dragPayload: DragBlockPayload,
    dropPayload: DropPayload,
    point: Point
  ) => {
    const result = this._getDropResult(dropBlock, dragPayload, dropPayload);
    const snapshot = dragPayload?.bsEntity?.snapshot;

    if (!result || !snapshot || snapshot.content.length === 0) return;

    {
      const isEdgelessContainer = dropBlock.closest('.edgeless-container');
      if (isEdgelessContainer) {
        // drop to edgeless container
        this._onDropOnEdgelessCanvas(
          dropBlock,
          dragPayload,
          dropPayload,
          point
        );
        return;
      }
    }

    const model = result.modelState.model;
    const parent =
      result.placement === 'in' ? model : this.std.store.getParent(model);

    if (!parent) return;
    if (matchFlavours(parent, ['affine:surface'])) {
      return;
    }

    const index =
      result.placement === 'in'
        ? 0
        : parent.children.indexOf(model) +
          (result.placement === 'before' ? 0 : 1);

    if (matchFlavours(parent, ['affine:note'])) {
      const [first] = snapshot.content;
      if (first.flavour === 'affine:note') {
        if (parent.id !== first.id) {
          this._onDropNoteOnNote(snapshot, parent.id, index);
        }
        return;
      }
    }

    if (
      (dragPayload.from?.docId === this.widget.doc.id &&
        result.placement === 'after' &&
        parent.children[index]?.id === snapshot.content[0].id) ||
      (result.placement === 'before' &&
        parent.children[index - 1]?.id === last(snapshot.content)!.id)
    ) {
      return;
    }

    this._dropToModel(snapshot, parent.id, index).catch(console.error);
  };

  private readonly _onDropNoteOnNote = (
    snapshot: SliceSnapshot,
    parent?: string,
    index?: number
  ) => {
    const [first] = snapshot.content;
    const id = first.id;

    const std = this.std;
    const job = this._getJob();
    const snapshotWithoutNote = {
      ...snapshot,
      content: first.children,
    };
    job
      .snapshotToSlice(snapshotWithoutNote, std.store, parent, index)
      .then(() => {
        const block = std.store.getBlock(id)?.model;
        if (block) {
          std.store.deleteBlock(block);
        }
      })
      .catch(console.error);
  };

  private readonly _onDropOnEdgelessCanvas = (
    dropBlock: BlockComponent,
    dragPayload: DragBlockPayload,
    dropPayload: DropPayload,
    point: Point
  ) => {
    const surfaceBlockModel = getSurfaceBlock(this.widget.doc);
    const result = this._getDropResult(dropBlock, dragPayload, dropPayload);

    const snapshot = dragPayload?.bsEntity?.snapshot;

    if (!result || !snapshot || !surfaceBlockModel) {
      return;
    }

    const [first] = snapshot.content;
    if (first.flavour === 'affine:note') return;

    if (snapshot.content.length === 1) {
      const importToSurface = (
        width: number,
        height: number,
        newBound: Bound
      ) => {
        first.props.xywh = newBound.serialize();
        first.props.width = width;
        first.props.height = height;

        const std = this.std;
        const job = this._getJob();
        job
          .snapshotToSlice(snapshot, std.store, surfaceBlockModel.id)
          .catch(console.error);
      };

      if (
        ['affine:attachment', 'affine:bookmark'].includes(first.flavour) ||
        first.flavour.startsWith('affine:embed-')
      ) {
        const style = (first.props.style ?? 'horizontal') as EmbedCardStyle;
        const width = EMBED_CARD_WIDTH[style];
        const height = EMBED_CARD_HEIGHT[style];

        const newBound = this._computeEdgelessBound(
          point.x,
          point.y,
          width,
          height
        );
        if (!newBound) return;

        if (first.flavour === 'affine:embed-linked-doc') {
          this._trackLinkedDocCreated(first.id);
        }

        importToSurface(width, height, newBound);
        return;
      }

      if (first.flavour === 'affine:image') {
        const noteScale = this.widget.noteScale.peek();
        const width = Number(first.props.width || 100) * noteScale;
        const height = Number(first.props.height || 100) * noteScale;

        const newBound = this._computeEdgelessBound(
          point.x,
          point.y,
          width,
          height
        );
        if (!newBound) return;

        importToSurface(width, height, newBound);
        return;
      }
    }

    const newNoteId = addNoteAtPoint(
      this.std,
      Point.from(
        this._gfx.viewport.toModelCoordFromClientCoord([point.x, point.y])
      ),
      {
        scale: this.widget.noteScale.peek(),
      }
    );
    const newNoteBlock = this.widget.doc.getBlock(newNoteId)?.model as
      | NoteBlockModel
      | undefined;
    if (!newNoteBlock) return;

    const bound = Bound.deserialize(newNoteBlock.xywh);
    bound.h *= this.widget.noteScale.peek();
    bound.w *= this.widget.noteScale.peek();
    this.widget.doc.updateBlock(newNoteBlock, {
      xywh: bound.serialize(),
      edgeless: {
        ...newNoteBlock.edgeless,
        scale: this.widget.noteScale.peek(),
      },
    });

    this._dropToModel(snapshot, newNoteId).catch(console.error);
  };

  private readonly _toSnapshot = (blocks: BlockComponent[]) => {
    const slice = Slice.fromModels(
      this.std.store,
      blocks.map(block => block.model)
    );
    const job = this._getJob();

    const snapshot = job.sliceToSnapshot(slice);
    if (!snapshot) return;

    return snapshot;
  };

  private readonly _trackLinkedDocCreated = (id: string) => {
    const isNewBlock = !this.std.store.hasBlock(id);
    if (!isNewBlock) {
      return;
    }

    const mode =
      this.std.getOptional(DocModeProvider)?.getEditorMode() ?? 'page';

    const telemetryService = this.std.getOptional(TelemetryProvider);
    telemetryService?.track('LinkedDocCreated', {
      control: `drop on ${mode}`,
      module: 'drag and drop',
      type: 'doc',
      other: 'new doc',
    });
  };

  constructor(readonly widget: AffineDragHandleWidget) {}

  private async _dropToModel(
    snapshot: SliceSnapshot,
    parent?: string,
    index?: number
  ) {
    try {
      const std = this.std;
      const job = this._getJob();

      if (snapshot.content.length === 1) {
        const [first] = snapshot.content;
        if (first.flavour === 'affine:embed-linked-doc') {
          this._trackLinkedDocCreated(first.id);
        }
      }
      // use snapshot
      const slice = await job.snapshotToSlice(
        snapshot,
        std.store,
        parent,
        index
      );
      return slice;
    } catch {
      return null;
    }
  }

  private _getJob() {
    const std = this.std;
    return std.getTransformer([
      newIdCrossDoc(std),
      reorderList(std),
      surfaceRefToEmbed(std),
    ]);
  }

  private _isDropOnCurrentEditor(std?: BlockStdScope) {
    return std === this.std;
  }

  watch() {
    this.widget.handleEvent('pointerDown', ctx => {
      const state = ctx.get('pointerState');
      const event = state.raw;
      const target = captureEventTarget(event.target);
      if (!target) return;

      if (this.widget.contains(target)) {
        return true;
      }

      return;
    });

    this.widget.handleEvent('dragStart', ctx => {
      const state = ctx.get('pointerState');
      const event = state.raw;
      const target = captureEventTarget(event.target);
      if (!target) return;

      if (this.widget.contains(target)) {
        return true;
      }

      return;
    });

    const widget = this.widget;
    const std = this.std;
    const disposables = widget.disposables;
    const scrollable = getScrollContainer(this.host);

    disposables.add(
      std.dnd.draggable<DragBlockEntity>({
        element: this.widget,
        canDrag: () => {
          const hoverBlock = this.widget.anchorBlockComponent.peek();
          return hoverBlock ? true : false;
        },
        onDragStart: () => {
          this.widget.dragging = true;
        },
        onDrop: () => {
          this._cleanup();
        },
        setDragPreview: ({ source, container }) => {
          if (!source.data?.bsEntity?.modelIds.length) {
            return;
          }

          this.previewHelper.renderDragPreview(
            source.data?.bsEntity?.modelIds,
            container
          );
        },
        setDragData: () => {
          const { snapshot } = this._getSnapshotFromHoveredBlocks();

          return {
            type: 'blocks',
            modelIds: snapshot ? extractIdsFromSnapshot(snapshot) : [],
            snapshot,
          };
        },
      })
    );

    if (scrollable) {
      disposables.add(
        std.dnd.autoScroll<DragBlockEntity>({
          element: scrollable,
          canScroll: ({ source }) => {
            return source.data?.bsEntity?.type === 'blocks';
          },
        })
      );
    }

    // used to handle drag move and drop
    disposables.add(
      std.dnd.monitor<DragBlockEntity>({
        canMonitor: ({ source }) => {
          const entity = source.data?.bsEntity;

          return entity?.type === 'blocks' && !!entity.snapshot;
        },
        onDropTargetChange: ({ location }) => {
          this._clearDropIndicator();

          if (
            !this._isDropOnCurrentEditor(
              (location.current.dropTargets[0]?.element as BlockComponent)?.std
            )
          ) {
            return;
          }
        },
        onDrop: ({ location, source }) => {
          this._clearDropIndicator();

          if (
            !this._isDropOnCurrentEditor(
              (location.current.dropTargets[0]?.element as BlockComponent)?.std
            )
          ) {
            return;
          }

          const target = location.current.dropTargets[0];
          const point = new Point(
            location.current.input.clientX,
            location.current.input.clientY
          );
          const dragPayload = source.data;
          const dropPayload = target.data;

          this._onDrop(
            target.element as BlockComponent,
            dragPayload,
            dropPayload,
            point
          );
        },
        onDrag: ({ location, source }) => {
          if (
            !this._isDropOnCurrentEditor(
              (location.current.dropTargets[0]?.element as BlockComponent)?.std
            ) ||
            !location.current.dropTargets[0]
          ) {
            return;
          }

          const target = location.current.dropTargets[0];
          const point = new Point(
            location.current.input.clientX,
            location.current.input.clientY
          );
          const dragPayload = source.data;
          const dropPayload = target.data;

          this._onDragMove(
            point,
            dragPayload,
            dropPayload,
            target.element as BlockComponent
          );
        },
      })
    );

    let dropTargetCleanUps: Map<string, (() => void)[]> = new Map();
    const makeBlockComponentDropTarget = (view: BlockComponent) => {
      if (view.model.role !== 'content' && view.model.role !== 'hub') {
        return;
      }

      const cleanups: (() => void)[] = [];

      cleanups.push(
        std.dnd.dropTarget<
          DragBlockEntity,
          {
            modelId: string;
          }
        >({
          element: view,
          getIsSticky: () => true,
          canDrop: ({ source }) => {
            if (source.data.bsEntity?.type === 'blocks') {
              return (
                source.data.from?.docId !== widget.doc.id ||
                source.data.bsEntity.modelIds.every(id => id !== view.model.id)
              );
            }

            return false;
          },
          setDropData: () => {
            return {
              modelId: view.model.id,
            };
          },
        })
      );

      if (matchFlavours(view.model, ['affine:attachment', 'affine:bookmark'])) {
        cleanups.push(
          std.dnd.draggable<DragBlockEntity>({
            element: view,
            canDrag: () => {
              return !isGfxBlockComponent(view);
            },
            onDragStart: () => {
              this.widget.dragging = true;
            },
            onDrop: () => {
              this._cleanup();
            },
            setDragPreview: ({ source, container }) => {
              if (!source.data?.bsEntity?.modelIds.length) {
                return;
              }

              this.previewHelper.renderDragPreview(
                source.data?.bsEntity?.modelIds,
                container
              );
            },
            setDragData: () => {
              const { snapshot } = this._getDraggedBlock(view);

              return {
                type: 'blocks',
                modelIds: snapshot ? extractIdsFromSnapshot(snapshot) : [],
                snapshot,
              };
            },
          })
        );
      }

      dropTargetCleanUps.set(view.model.id, cleanups);
    };

    disposables.add(
      std.view.viewUpdated.on(payload => {
        if (payload.type === 'add') {
          makeBlockComponentDropTarget(payload.view);
        } else if (
          payload.type === 'delete' &&
          dropTargetCleanUps.has(payload.id)
        ) {
          dropTargetCleanUps.get(payload.id)!.forEach(clean => clean());
          dropTargetCleanUps.delete(payload.id);
        }
      })
    );

    std.view.views.forEach(block => {
      makeBlockComponentDropTarget(block);
    });

    disposables.add(() => {
      dropTargetCleanUps.forEach(cleanUps => cleanUps.forEach(fn => fn()));
      dropTargetCleanUps.clear();
    });
  }
}
