import { notify } from '@affine/component';
import {
  isMindmapChild,
  isMindMapRoot,
} from '@affine/core/blocksuite/presets/ai/utils/edgeless';
import { EditorService } from '@affine/core/modules/editor';
import { apis } from '@affine/electron-api';
import { I18n } from '@affine/i18n';
import type { BlockStdScope } from '@blocksuite/affine/block-std';
import {
  type GfxBlockElementModel,
  type GfxModel,
  GfxPrimitiveElementModel,
  isGfxGroupCompatibleModel,
} from '@blocksuite/affine/block-std/gfx';
import type {
  EdgelessRootService,
  MenuContext,
} from '@blocksuite/affine/blocks';
import { Bound, getCommonBound } from '@blocksuite/affine/global/utils';
import { CopyAsImgaeIcon } from '@blocksuite/icons/lit';
import type { FrameworkProvider } from '@toeverything/infra';

const snapshotStyle = `
  affine-edgeless-root .widgets-container,
  .copy-as-image-transparent {
    opacity: 0;
  }
  .edgeless-background {
    background-image: none;
  }
`;

function getSelectedRect() {
  const selected = document
    .querySelector('edgeless-selected-rect')
    ?.shadowRoot?.querySelector('.affine-edgeless-selected-rect');
  if (!selected) {
    throw new Error('Missing edgeless selected rect');
  }
  return selected.getBoundingClientRect();
}

function expandBound(bound: Bound, margin: number) {
  const x = bound.x - margin;
  const y = bound.y - margin;
  const w = bound.w + margin * 2;
  const h = bound.h + margin * 2;
  return new Bound(x, y, w, h);
}

function isOverlap(target: Bound, source: Bound) {
  const { x, y, w, h } = source;
  const left = target.x;
  const top = target.y;
  const right = target.x + target.w;
  const bottom = target.y + target.h;

  return x < right && y < bottom && x + w > left && y + h > top;
}

function isInside(target: Bound, source: Bound) {
  const { x, y, w, h } = source;
  const left = target.x;
  const top = target.y;
  const right = target.x + target.w;
  const bottom = target.y + target.h;

  return x >= left && y >= top && x + w <= right && y + h <= bottom;
}

function hideEdgelessElements(elements: GfxModel[], std: BlockStdScope) {
  elements.forEach(ele => {
    if (ele instanceof GfxPrimitiveElementModel) {
      (ele as any).lastOpacity = ele.opacity;
      ele.opacity = 0;
    } else {
      const block = std.view.getBlock(ele.id);
      if (!block) return;
      block.classList.add('copy-as-image-transparent');
    }
  });
}

function showEdgelessElements(elements: GfxModel[], std: BlockStdScope) {
  elements.forEach(ele => {
    if (ele instanceof GfxPrimitiveElementModel) {
      ele.opacity = (ele as any).lastOpacity;
      delete (ele as any).lastOpacity;
    } else {
      const block = std.view.getBlock(ele.id);
      if (!block) return;
      block.classList.remove('copy-as-image-transparent');
    }
  });
}

function withDescendantElements(elements: GfxModel[]) {
  const set = new Set<GfxModel>();
  elements.forEach(element => {
    if (set.has(element)) return;
    set.add(element);
    if (isGfxGroupCompatibleModel(element)) {
      element.descendantElements.forEach(descendant => set.add(descendant));
    }
  });
  return [...set];
}

const MARGIN = 20;

export function createCopyAsPngMenuItem(framework: FrameworkProvider) {
  return {
    icon: CopyAsImgaeIcon({ width: '20', height: '20' }),
    label: 'Copy as Image',
    type: 'copy-as-image',
    when: (ctx: MenuContext) => {
      if (ctx.isEmpty()) return false;
      const { editor } = framework.get(EditorService);
      const mode = editor.mode$.value;
      return mode === 'edgeless';
    },
    action: async (ctx: MenuContext) => {
      if (!apis) {
        notify.error({
          title: I18n.t('com.affine.copy.asImage.notAvailable.title'),
          message: I18n.t('com.affine.copy.asImage.notAvailable.message'),
          action: {
            label: I18n.t('com.affine.copy.asImage.notAvailable.action'),
            onClick: () => {
              window.open('https://affine.pro/download');
            },
          },
        });
        return;
      }

      const service =
        ctx.host.std.getService<EdgelessRootService>('affine:page');
      if (!service) return;

      let selected = service.selection.selectedElements;
      // select mindmap if root node selected
      const maybeMindmap = selected[0];
      const mindmapId = maybeMindmap.group?.id;
      if (
        selected.length === 1 &&
        mindmapId &&
        (isMindMapRoot(maybeMindmap) || isMindmapChild(maybeMindmap))
      ) {
        service.gfx.selection.set({ elements: [mindmapId] });
      }

      // select bound
      selected = service.selection.selectedElements;
      const elements = withDescendantElements(selected);
      const bounds = elements.map(element => Bound.deserialize(element.xywh));
      const bound = getCommonBound(bounds);
      if (!bound) return;
      const { zoom } = service.viewport;
      const exBound = expandBound(bound, MARGIN * zoom);

      // fit to screen
      if (
        !isInside(service.viewport.viewportBounds, exBound) ||
        service.viewport.zoom < 1
      ) {
        service.viewport.setViewportByBound(bound, [20, 20, 20, 20], false);
        if (service.viewport.zoom > 1) {
          service.viewport.setZoom(1);
        }
      }

      // hide unselected overlap elements
      const overlapElements = service.gfx.gfxElements.filter(ele => {
        const eleBound = Bound.deserialize(ele.xywh);
        const exEleBound = expandBound(eleBound, MARGIN * zoom);
        const isSelected = elements.includes(ele);
        return !isSelected && isOverlap(exBound, exEleBound);
      });
      hideEdgelessElements(overlapElements, ctx.host.std);

      // add css style
      const styleEle = document.createElement('style');
      styleEle.innerHTML = snapshotStyle;
      document.head.append(styleEle);

      // capture image
      setTimeout(() => {
        if (!apis) return;
        try {
          const domRect = getSelectedRect();
          const { zoom } = service.viewport;
          const isFrameSelected =
            selected.length === 1 &&
            (selected[0] as GfxBlockElementModel).flavour === 'affine:frame';
          const margin = isFrameSelected ? -2 : MARGIN * zoom;

          service.selection.clear();
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          apis.ui
            .captureArea({
              x: domRect.left - margin,
              y: domRect.top - margin,
              width: domRect.width + margin * 2,
              height: domRect.height + margin * 2,
            })
            .then(() => {
              notify.success({
                title: I18n.t('com.affine.copy.asImage.success'),
              });
            })
            .catch(e => {
              notify.error({
                title: I18n.t('com.affine.copy.asImage.failed'),
                message: String(e),
              });
            })
            .finally(() => {
              styleEle.remove();
              showEdgelessElements(overlapElements, ctx.host.std);
            });
        } catch (e) {
          styleEle.remove();
          showEdgelessElements(overlapElements, ctx.host.std);
          notify.error({
            title: I18n.t('com.affine.copy.asImage.failed'),
            message: String(e),
          });
        }
      }, 100);
    },
  };
}
