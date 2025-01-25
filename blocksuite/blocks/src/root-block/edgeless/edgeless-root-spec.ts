import { FileDropExtension } from '@blocksuite/affine-components/drag-indicator';
import {
  DNDAPIExtension,
  DocModeService,
  EmbedOptionService,
  PageViewportServiceExtension,
  ThemeService,
} from '@blocksuite/affine-shared/services';
import { AFFINE_DRAG_HANDLE_WIDGET } from '@blocksuite/affine-widget-drag-handle';
import { AFFINE_FRAME_TITLE_WIDGET } from '@blocksuite/affine-widget-frame-title';
import {
  AFFINE_DOC_REMOTE_SELECTION_WIDGET,
  AFFINE_EDGELESS_REMOTE_SELECTION_WIDGET,
} from '@blocksuite/affine-widget-remote-selection';
import { AFFINE_SCROLL_ANCHORING_WIDGET } from '@blocksuite/affine-widget-scroll-anchoring';
import {
  BlockServiceWatcher,
  BlockViewExtension,
  CommandExtension,
  FlavourExtension,
  WidgetViewMapExtension,
} from '@blocksuite/block-std';
import { ToolController } from '@blocksuite/block-std/gfx';
import type { ExtensionType } from '@blocksuite/store';
import { literal, unsafeStatic } from 'lit/static-html.js';

import { ExportManagerExtension } from '../../_common/export-manager/export-manager.js';
import { RootBlockAdapterExtensions } from '../adapters/extension.js';
import { commands } from '../commands/index.js';
import { AFFINE_EDGELESS_AUTO_CONNECT_WIDGET } from '../widgets/edgeless-auto-connect/edgeless-auto-connect.js';
import { AFFINE_EDGELESS_ZOOM_TOOLBAR_WIDGET } from '../widgets/edgeless-zoom-toolbar/index.js';
import { EDGELESS_ELEMENT_TOOLBAR_WIDGET } from '../widgets/element-toolbar/index.js';
import { AFFINE_EMBED_CARD_TOOLBAR_WIDGET } from '../widgets/embed-card-toolbar/embed-card-toolbar.js';
import { AFFINE_FORMAT_BAR_WIDGET } from '../widgets/format-bar/format-bar.js';
import { AFFINE_INNER_MODAL_WIDGET } from '../widgets/inner-modal/inner-modal.js';
import { AFFINE_LINKED_DOC_WIDGET } from '../widgets/linked-doc/index.js';
import { AFFINE_MODAL_WIDGET } from '../widgets/modal/modal.js';
import { AFFINE_SLASH_MENU_WIDGET } from '../widgets/slash-menu/index.js';
import { AFFINE_VIEWPORT_OVERLAY_WIDGET } from '../widgets/viewport-overlay/viewport-overlay.js';
import { NOTE_SLICER_WIDGET } from './components/note-slicer/index.js';
import { EDGELESS_NAVIGATOR_BLACK_BACKGROUND_WIDGET } from './components/presentation/edgeless-navigator-black-background.js';
import { EDGELESS_DRAGGING_AREA_WIDGET } from './components/rects/edgeless-dragging-area-rect.js';
import { EDGELESS_SELECTED_RECT_WIDGET } from './components/rects/edgeless-selected-rect.js';
import { EDGELESS_TOOLBAR_WIDGET } from './components/toolbar/edgeless-toolbar.js';
import { EdgelessRootService } from './edgeless-root-service.js';

export const edgelessRootWidgetViewMap = {
  [AFFINE_MODAL_WIDGET]: literal`${unsafeStatic(AFFINE_MODAL_WIDGET)}`,
  [AFFINE_INNER_MODAL_WIDGET]: literal`${unsafeStatic(AFFINE_INNER_MODAL_WIDGET)}`,
  [AFFINE_SLASH_MENU_WIDGET]: literal`${unsafeStatic(
    AFFINE_SLASH_MENU_WIDGET
  )}`,
  [AFFINE_LINKED_DOC_WIDGET]: literal`${unsafeStatic(
    AFFINE_LINKED_DOC_WIDGET
  )}`,
  [AFFINE_DRAG_HANDLE_WIDGET]: literal`${unsafeStatic(
    AFFINE_DRAG_HANDLE_WIDGET
  )}`,
  [AFFINE_EMBED_CARD_TOOLBAR_WIDGET]: literal`${unsafeStatic(
    AFFINE_EMBED_CARD_TOOLBAR_WIDGET
  )}`,
  [AFFINE_FORMAT_BAR_WIDGET]: literal`${unsafeStatic(
    AFFINE_FORMAT_BAR_WIDGET
  )}`,
  [AFFINE_DOC_REMOTE_SELECTION_WIDGET]: literal`${unsafeStatic(
    AFFINE_DOC_REMOTE_SELECTION_WIDGET
  )}`,
  [AFFINE_EDGELESS_REMOTE_SELECTION_WIDGET]: literal`${unsafeStatic(
    AFFINE_EDGELESS_REMOTE_SELECTION_WIDGET
  )}`,
  [AFFINE_EDGELESS_ZOOM_TOOLBAR_WIDGET]: literal`${unsafeStatic(
    AFFINE_EDGELESS_ZOOM_TOOLBAR_WIDGET
  )}`,
  [AFFINE_FRAME_TITLE_WIDGET]: literal`${unsafeStatic(AFFINE_FRAME_TITLE_WIDGET)}`,
  [EDGELESS_ELEMENT_TOOLBAR_WIDGET]: literal`${unsafeStatic(EDGELESS_ELEMENT_TOOLBAR_WIDGET)}`,
  [AFFINE_VIEWPORT_OVERLAY_WIDGET]: literal`${unsafeStatic(
    AFFINE_VIEWPORT_OVERLAY_WIDGET
  )}`,
  [AFFINE_EDGELESS_AUTO_CONNECT_WIDGET]: literal`${unsafeStatic(
    AFFINE_EDGELESS_AUTO_CONNECT_WIDGET
  )}`,
  [AFFINE_SCROLL_ANCHORING_WIDGET]: literal`${unsafeStatic(AFFINE_SCROLL_ANCHORING_WIDGET)}`,
  [EDGELESS_DRAGGING_AREA_WIDGET]: literal`${unsafeStatic(EDGELESS_DRAGGING_AREA_WIDGET)}`,
  [NOTE_SLICER_WIDGET]: literal`${unsafeStatic(NOTE_SLICER_WIDGET)}`,
  [EDGELESS_NAVIGATOR_BLACK_BACKGROUND_WIDGET]: literal`${unsafeStatic(EDGELESS_NAVIGATOR_BLACK_BACKGROUND_WIDGET)}`,
  [EDGELESS_SELECTED_RECT_WIDGET]: literal`${unsafeStatic(EDGELESS_SELECTED_RECT_WIDGET)}`,
  [EDGELESS_TOOLBAR_WIDGET]: literal`${unsafeStatic(EDGELESS_TOOLBAR_WIDGET)}`,
};

const EdgelessCommonExtension: ExtensionType[] = [
  FlavourExtension('affine:page'),
  EdgelessRootService,
  DocModeService,
  ThemeService,
  EmbedOptionService,
  CommandExtension(commands),
  ExportManagerExtension,
  ToolController,
  DNDAPIExtension,
  PageViewportServiceExtension,
  RootBlockAdapterExtensions,
  FileDropExtension,
].flat();

export const EdgelessRootBlockSpec: ExtensionType[] = [
  ...EdgelessCommonExtension,
  BlockViewExtension('affine:page', literal`affine-edgeless-root`),
  WidgetViewMapExtension('affine:page', edgelessRootWidgetViewMap),
];

class EdgelessLocker extends BlockServiceWatcher {
  static override readonly flavour = 'affine:page';

  override mounted() {
    const service = this.blockService;
    service.disposables.add(
      service.specSlots.viewConnected.on(({ service }) => {
        // Does not allow the user to move and zoom.
        (service as EdgelessRootService).locked = true;
      })
    );
  }
}

export const PreviewEdgelessRootBlockSpec: ExtensionType[] = [
  ...EdgelessCommonExtension,
  BlockViewExtension('affine:page', literal`affine-edgeless-root-preview`),
  EdgelessLocker,
];
