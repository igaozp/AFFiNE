import { effects as blockAttachmentEffects } from '@blocksuite/affine-block-attachment/effects';
import { effects as blockBookmarkEffects } from '@blocksuite/affine-block-bookmark/effects';
import { effects as blockCodeEffects } from '@blocksuite/affine-block-code/effects';
import { effects as blockDataViewEffects } from '@blocksuite/affine-block-data-view/effects';
import { effects as blockDatabaseEffects } from '@blocksuite/affine-block-database/effects';
import { effects as blockDividerEffects } from '@blocksuite/affine-block-divider/effects';
import { effects as blockEdgelessTextEffects } from '@blocksuite/affine-block-edgeless-text/effects';
import { effects as blockEmbedEffects } from '@blocksuite/affine-block-embed/effects';
import { effects as blockFrameEffects } from '@blocksuite/affine-block-frame/effects';
import { effects as blockImageEffects } from '@blocksuite/affine-block-image/effects';
import { effects as blockLatexEffects } from '@blocksuite/affine-block-latex/effects';
import { effects as blockListEffects } from '@blocksuite/affine-block-list/effects';
import { effects as blockNoteEffects } from '@blocksuite/affine-block-note/effects';
import { effects as blockParagraphEffects } from '@blocksuite/affine-block-paragraph/effects';
import { effects as blockSurfaceEffects } from '@blocksuite/affine-block-surface/effects';
import { effects as blockSurfaceRefEffects } from '@blocksuite/affine-block-surface-ref/effects';
import { effects as blockTableEffects } from '@blocksuite/affine-block-table/effects';
import { effects as componentAiItemEffects } from '@blocksuite/affine-components/ai-item';
import { BlockSelection } from '@blocksuite/affine-components/block-selection';
import { BlockZeroWidth } from '@blocksuite/affine-components/block-zero-width';
import { effects as componentCaptionEffects } from '@blocksuite/affine-components/caption';
import { effects as componentColorPickerEffects } from '@blocksuite/affine-components/color-picker';
import { effects as componentContextMenuEffects } from '@blocksuite/affine-components/context-menu';
import { effects as componentDatePickerEffects } from '@blocksuite/affine-components/date-picker';
import { effects as componentDragIndicatorEffects } from '@blocksuite/affine-components/drag-indicator';
import { FilterableListComponent } from '@blocksuite/affine-components/filterable-list';
import { IconButton } from '@blocksuite/affine-components/icon-button';
import { effects as componentPortalEffects } from '@blocksuite/affine-components/portal';
import { effects as componentRichTextEffects } from '@blocksuite/affine-components/rich-text';
import { SmoothCorner } from '@blocksuite/affine-components/smooth-corner';
import { effects as componentToggleButtonEffects } from '@blocksuite/affine-components/toggle-button';
import { ToggleSwitch } from '@blocksuite/affine-components/toggle-switch';
import { effects as componentToolbarEffects } from '@blocksuite/affine-components/toolbar';
import { effects as widgetDragHandleEffects } from '@blocksuite/affine-widget-drag-handle/effects';
import { effects as widgetFrameTitleEffects } from '@blocksuite/affine-widget-frame-title/effects';
import { effects as widgetRemoteSelectionEffects } from '@blocksuite/affine-widget-remote-selection/effects';
import { effects as widgetScrollAnchoringEffects } from '@blocksuite/affine-widget-scroll-anchoring/effects';
import type { BlockComponent } from '@blocksuite/block-std';
import { effects as stdEffects } from '@blocksuite/block-std/effects';
import { effects as dataViewEffects } from '@blocksuite/data-view/effects';
import { effects as inlineEffects } from '@blocksuite/inline/effects';
import type { BlockModel } from '@blocksuite/store';

import { registerSpecs } from './_specs/register-specs.js';
import { EdgelessAutoCompletePanel } from './root-block/edgeless/components/auto-complete/auto-complete-panel.js';
import { EdgelessAutoComplete } from './root-block/edgeless/components/auto-complete/edgeless-auto-complete.js';
import { EdgelessToolIconButton } from './root-block/edgeless/components/buttons/tool-icon-button.js';
import { EdgelessToolbarButton } from './root-block/edgeless/components/buttons/toolbar-button.js';
import { EdgelessConnectorHandle } from './root-block/edgeless/components/connector/connector-handle.js';
import {
  NOTE_SLICER_WIDGET,
  NoteSlicer,
} from './root-block/edgeless/components/note-slicer/index.js';
import { EdgelessAlignPanel } from './root-block/edgeless/components/panel/align-panel.js';
import { CardStylePanel } from './root-block/edgeless/components/panel/card-style-panel.js';
import {
  EdgelessColorButton,
  EdgelessColorPanel,
  EdgelessTextColorIcon,
} from './root-block/edgeless/components/panel/color-panel.js';
import { EdgelessFontFamilyPanel } from './root-block/edgeless/components/panel/font-family-panel.js';
import { EdgelessFontWeightAndStylePanel } from './root-block/edgeless/components/panel/font-weight-and-style-panel.js';
import { EdgelessLineWidthPanel } from './root-block/edgeless/components/panel/line-width-panel.js';
import { NoteDisplayModePanel } from './root-block/edgeless/components/panel/note-display-mode-panel.js';
import { EdgelessNoteShadowPanel } from './root-block/edgeless/components/panel/note-shadow-panel.js';
import { EdgelessScalePanel } from './root-block/edgeless/components/panel/scale-panel.js';
import { EdgelessShapePanel } from './root-block/edgeless/components/panel/shape-panel.js';
import { EdgelessShapeStylePanel } from './root-block/edgeless/components/panel/shape-style-panel.js';
import { EdgelessSizePanel } from './root-block/edgeless/components/panel/size-panel.js';
import { StrokeStylePanel } from './root-block/edgeless/components/panel/stroke-style-panel.js';
import {
  EDGELESS_NAVIGATOR_BLACK_BACKGROUND_WIDGET,
  EdgelessNavigatorBlackBackgroundWidget,
} from './root-block/edgeless/components/presentation/edgeless-navigator-black-background.js';
import {
  EDGELESS_DRAGGING_AREA_WIDGET,
  EdgelessDraggingAreaRectWidget,
} from './root-block/edgeless/components/rects/edgeless-dragging-area-rect.js';
import {
  EDGELESS_SELECTED_RECT_WIDGET,
  EdgelessSelectedRectWidget,
} from './root-block/edgeless/components/rects/edgeless-selected-rect.js';
import { EdgelessConnectorLabelEditor } from './root-block/edgeless/components/text/edgeless-connector-label-editor.js';
import { EdgelessFrameTitleEditor } from './root-block/edgeless/components/text/edgeless-frame-title-editor.js';
import { EdgelessGroupTitleEditor } from './root-block/edgeless/components/text/edgeless-group-title-editor.js';
import { EdgelessShapeTextEditor } from './root-block/edgeless/components/text/edgeless-shape-text-editor.js';
import { EdgelessTextEditor } from './root-block/edgeless/components/text/edgeless-text-editor.js';
import { EdgelessBrushMenu } from './root-block/edgeless/components/toolbar/brush/brush-menu.js';
import { EdgelessBrushToolButton } from './root-block/edgeless/components/toolbar/brush/brush-tool-button.js';
import { EdgelessSlideMenu } from './root-block/edgeless/components/toolbar/common/slide-menu.js';
import { EdgelessConnectorMenu } from './root-block/edgeless/components/toolbar/connector/connector-menu.js';
import { EdgelessConnectorToolButton } from './root-block/edgeless/components/toolbar/connector/connector-tool-button.js';
import { EdgelessDefaultToolButton } from './root-block/edgeless/components/toolbar/default/default-tool-button.js';
import {
  EDGELESS_TOOLBAR_WIDGET,
  EdgelessToolbarWidget,
} from './root-block/edgeless/components/toolbar/edgeless-toolbar.js';
import { EdgelessEraserToolButton } from './root-block/edgeless/components/toolbar/eraser/eraser-tool-button.js';
import { EdgelessFrameMenu } from './root-block/edgeless/components/toolbar/frame/frame-menu.js';
import { EdgelessFrameToolButton } from './root-block/edgeless/components/toolbar/frame/frame-tool-button.js';
import { EdgelessLassoToolButton } from './root-block/edgeless/components/toolbar/lasso/lasso-tool-button.js';
import { EdgelessLinkToolButton } from './root-block/edgeless/components/toolbar/link/link-tool-button.js';
import { MindMapPlaceholder } from './root-block/edgeless/components/toolbar/mindmap/mindmap-importing-placeholder.js';
import { EdgelessMindmapMenu } from './root-block/edgeless/components/toolbar/mindmap/mindmap-menu.js';
import { EdgelessMindmapToolButton } from './root-block/edgeless/components/toolbar/mindmap/mindmap-tool-button.js';
import { EdgelessNoteMenu } from './root-block/edgeless/components/toolbar/note/note-menu.js';
import { EdgelessNoteSeniorButton } from './root-block/edgeless/components/toolbar/note/note-senior-button.js';
import { EdgelessNoteToolButton } from './root-block/edgeless/components/toolbar/note/note-tool-button.js';
import { EdgelessFrameOrderButton } from './root-block/edgeless/components/toolbar/present/frame-order-button.js';
import { EdgelessFrameOrderMenu } from './root-block/edgeless/components/toolbar/present/frame-order-menu.js';
import { EdgelessNavigatorSettingButton } from './root-block/edgeless/components/toolbar/present/navigator-setting-button.js';
import { EdgelessPresentButton } from './root-block/edgeless/components/toolbar/present/present-button.js';
import { PresentationToolbar } from './root-block/edgeless/components/toolbar/presentation-toolbar.js';
import { EdgelessToolbarShapeDraggable } from './root-block/edgeless/components/toolbar/shape/shape-draggable.js';
import { EdgelessShapeMenu } from './root-block/edgeless/components/toolbar/shape/shape-menu.js';
import { EdgelessShapeToolButton } from './root-block/edgeless/components/toolbar/shape/shape-tool-button.js';
import { EdgelessShapeToolElement } from './root-block/edgeless/components/toolbar/shape/shape-tool-element.js';
import { OverlayScrollbar } from './root-block/edgeless/components/toolbar/template/overlay-scrollbar.js';
import { AffineTemplateLoading } from './root-block/edgeless/components/toolbar/template/template-loading.js';
import { EdgelessTemplatePanel } from './root-block/edgeless/components/toolbar/template/template-panel.js';
import { EdgelessTemplateButton } from './root-block/edgeless/components/toolbar/template/template-tool-button.js';
import { EdgelessTextMenu } from './root-block/edgeless/components/toolbar/text/text-menu.js';
import { EdgelessRootPreviewBlockComponent } from './root-block/edgeless/edgeless-root-preview-block.js';
import {
  AFFINE_AI_PANEL_WIDGET,
  AFFINE_EDGELESS_COPILOT_WIDGET,
  AFFINE_EMBED_CARD_TOOLBAR_WIDGET,
  AFFINE_FORMAT_BAR_WIDGET,
  AffineAIPanelWidget,
  AffineEdgelessZoomToolbarWidget,
  AffineFormatBarWidget,
  AffineImageToolbarWidget,
  AffineInnerModalWidget,
  AffineModalWidget,
  AffinePageDraggingAreaWidget,
  AffineSlashMenuWidget,
  AffineSurfaceRefToolbar,
  EdgelessCopilotToolbarEntry,
  EdgelessCopilotWidget,
  EdgelessRootBlockComponent,
  EmbedCardToolbar,
  FramePreview,
  PageRootBlockComponent,
  PreviewRootBlockComponent,
  type RootBlockConfig,
  type RootService,
} from './root-block/index.js';
import { AIFinishTip } from './root-block/widgets/ai-panel/components/finish-tip.js';
import { GeneratingPlaceholder } from './root-block/widgets/ai-panel/components/generating-placeholder.js';
import {
  AIPanelAnswer,
  AIPanelDivider,
  AIPanelError,
  AIPanelGenerating,
  AIPanelInput,
} from './root-block/widgets/ai-panel/components/index.js';
import {
  AFFINE_EDGELESS_AUTO_CONNECT_WIDGET,
  EdgelessAutoConnectWidget,
} from './root-block/widgets/edgeless-auto-connect/edgeless-auto-connect.js';
import { EdgelessCopilotPanel } from './root-block/widgets/edgeless-copilot-panel/index.js';
import { AFFINE_EDGELESS_ZOOM_TOOLBAR_WIDGET } from './root-block/widgets/edgeless-zoom-toolbar/index.js';
import { ZoomBarToggleButton } from './root-block/widgets/edgeless-zoom-toolbar/zoom-bar-toggle-button.js';
import { EdgelessZoomToolbar } from './root-block/widgets/edgeless-zoom-toolbar/zoom-toolbar.js';
import { effects as widgetEdgelessElementToolbarEffects } from './root-block/widgets/element-toolbar/effects.js';
import { AffineImageToolbar } from './root-block/widgets/image-toolbar/components/image-toolbar.js';
import { AFFINE_IMAGE_TOOLBAR_WIDGET } from './root-block/widgets/image-toolbar/index.js';
import { AFFINE_INNER_MODAL_WIDGET } from './root-block/widgets/inner-modal/inner-modal.js';
import { effects as widgetMobileToolbarEffects } from './root-block/widgets/keyboard-toolbar/effects.js';
import { effects as widgetLinkedDocEffects } from './root-block/widgets/linked-doc/effects.js';
import { Loader } from './root-block/widgets/linked-doc/import-doc/loader';
import { AffineCustomModal } from './root-block/widgets/modal/custom-modal.js';
import { AFFINE_MODAL_WIDGET } from './root-block/widgets/modal/modal.js';
import { AFFINE_PAGE_DRAGGING_AREA_WIDGET } from './root-block/widgets/page-dragging-area/page-dragging-area.js';
import { AFFINE_SLASH_MENU_WIDGET } from './root-block/widgets/slash-menu/index.js';
import {
  InnerSlashMenu,
  SlashMenu,
} from './root-block/widgets/slash-menu/slash-menu-popover.js';
import { AFFINE_SURFACE_REF_TOOLBAR } from './root-block/widgets/surface-ref-toolbar/surface-ref-toolbar.js';
import {
  AFFINE_VIEWPORT_OVERLAY_WIDGET,
  AffineViewportOverlayWidget,
} from './root-block/widgets/viewport-overlay/viewport-overlay.js';

export function effects() {
  registerSpecs();

  stdEffects();
  inlineEffects();

  blockNoteEffects();
  blockAttachmentEffects();
  blockBookmarkEffects();
  blockFrameEffects();
  blockListEffects();
  blockParagraphEffects();
  blockEmbedEffects();
  blockSurfaceEffects();
  blockImageEffects();
  blockDatabaseEffects();
  blockSurfaceRefEffects();
  blockLatexEffects();
  blockEdgelessTextEffects();
  blockDividerEffects();
  blockDataViewEffects();
  blockCodeEffects();
  blockTableEffects();

  componentCaptionEffects();
  componentContextMenuEffects();
  componentDatePickerEffects();
  componentPortalEffects();
  componentRichTextEffects();
  componentToolbarEffects();
  componentDragIndicatorEffects();
  componentToggleButtonEffects();
  componentAiItemEffects();
  componentColorPickerEffects();

  widgetScrollAnchoringEffects();
  widgetMobileToolbarEffects();
  widgetLinkedDocEffects();
  widgetFrameTitleEffects();
  widgetEdgelessElementToolbarEffects();
  widgetRemoteSelectionEffects();
  widgetDragHandleEffects();
  dataViewEffects();

  customElements.define('affine-page-root', PageRootBlockComponent);
  customElements.define('affine-preview-root', PreviewRootBlockComponent);
  customElements.define('affine-edgeless-root', EdgelessRootBlockComponent);
  customElements.define('edgeless-copilot-panel', EdgelessCopilotPanel);
  customElements.define(
    'edgeless-copilot-toolbar-entry',
    EdgelessCopilotToolbarEntry
  );
  customElements.define('edgeless-connector-handle', EdgelessConnectorHandle);
  customElements.define('edgeless-zoom-toolbar', EdgelessZoomToolbar);
  customElements.define(
    'affine-edgeless-root-preview',
    EdgelessRootPreviewBlockComponent
  );
  customElements.define('affine-custom-modal', AffineCustomModal);
  customElements.define('affine-slash-menu', SlashMenu);
  customElements.define('inner-slash-menu', InnerSlashMenu);
  customElements.define('generating-placeholder', GeneratingPlaceholder);
  customElements.define('ai-finish-tip', AIFinishTip);
  customElements.define('ai-panel-divider', AIPanelDivider);
  customElements.define(NOTE_SLICER_WIDGET, NoteSlicer);
  customElements.define(
    EDGELESS_NAVIGATOR_BLACK_BACKGROUND_WIDGET,
    EdgelessNavigatorBlackBackgroundWidget
  );
  customElements.define('zoom-bar-toggle-button', ZoomBarToggleButton);
  customElements.define(
    EDGELESS_DRAGGING_AREA_WIDGET,
    EdgelessDraggingAreaRectWidget
  );
  customElements.define('icon-button', IconButton);
  customElements.define('loader-element', Loader);
  customElements.define('edgeless-brush-menu', EdgelessBrushMenu);
  customElements.define('edgeless-brush-tool-button', EdgelessBrushToolButton);
  customElements.define(
    'edgeless-connector-tool-button',
    EdgelessConnectorToolButton
  );
  customElements.define(
    'edgeless-default-tool-button',
    EdgelessDefaultToolButton
  );
  customElements.define('edgeless-connector-menu', EdgelessConnectorMenu);
  customElements.define('smooth-corner', SmoothCorner);
  customElements.define('toggle-switch', ToggleSwitch);
  customElements.define('ai-panel-answer', AIPanelAnswer);
  customElements.define(
    'edgeless-eraser-tool-button',
    EdgelessEraserToolButton
  );
  customElements.define('edgeless-frame-menu', EdgelessFrameMenu);
  customElements.define('edgeless-frame-tool-button', EdgelessFrameToolButton);
  customElements.define('ai-panel-input', AIPanelInput);
  customElements.define('ai-panel-generating', AIPanelGenerating);
  customElements.define('edgeless-link-tool-button', EdgelessLinkToolButton);
  customElements.define('edgeless-mindmap-menu', EdgelessMindmapMenu);
  customElements.define('edgeless-lasso-tool-button', EdgelessLassoToolButton);
  customElements.define('affine-filterable-list', FilterableListComponent);
  customElements.define('ai-panel-error', AIPanelError);
  customElements.define(
    EDGELESS_SELECTED_RECT_WIDGET,
    EdgelessSelectedRectWidget
  );
  customElements.define('mindmap-import-placeholder', MindMapPlaceholder);
  customElements.define(
    'edgeless-note-senior-button',
    EdgelessNoteSeniorButton
  );
  customElements.define('edgeless-align-panel', EdgelessAlignPanel);
  customElements.define('card-style-panel', CardStylePanel);
  customElements.define('edgeless-color-button', EdgelessColorButton);
  customElements.define('edgeless-color-panel', EdgelessColorPanel);
  customElements.define('edgeless-text-color-icon', EdgelessTextColorIcon);
  customElements.define(
    'edgeless-mindmap-tool-button',
    EdgelessMindmapToolButton
  );
  customElements.define('edgeless-note-tool-button', EdgelessNoteToolButton);
  customElements.define('edgeless-note-menu', EdgelessNoteMenu);
  customElements.define('edgeless-line-width-panel', EdgelessLineWidthPanel);
  customElements.define(
    'edgeless-frame-order-button',
    EdgelessFrameOrderButton
  );
  customElements.define('edgeless-frame-order-menu', EdgelessFrameOrderMenu);
  customElements.define(
    'edgeless-auto-complete-panel',
    EdgelessAutoCompletePanel
  );
  customElements.define(
    'edgeless-navigator-setting-button',
    EdgelessNavigatorSettingButton
  );
  customElements.define('edgeless-present-button', EdgelessPresentButton);
  customElements.define('overlay-scrollbar', OverlayScrollbar);
  customElements.define('affine-template-loading', AffineTemplateLoading);
  customElements.define('edgeless-auto-complete', EdgelessAutoComplete);
  customElements.define(
    'edgeless-font-weight-and-style-panel',
    EdgelessFontWeightAndStylePanel
  );
  customElements.define('edgeless-note-shadow-panel', EdgelessNoteShadowPanel);
  customElements.define('edgeless-templates-panel', EdgelessTemplatePanel);
  customElements.define('edgeless-text-menu', EdgelessTextMenu);
  customElements.define('edgeless-template-button', EdgelessTemplateButton);
  customElements.define('edgeless-tool-icon-button', EdgelessToolIconButton);
  customElements.define('edgeless-size-panel', EdgelessSizePanel);
  customElements.define('edgeless-scale-panel', EdgelessScalePanel);
  customElements.define('edgeless-font-family-panel', EdgelessFontFamilyPanel);
  customElements.define('edgeless-shape-panel', EdgelessShapePanel);
  customElements.define('note-display-mode-panel', NoteDisplayModePanel);
  customElements.define('edgeless-toolbar-button', EdgelessToolbarButton);
  customElements.define('frame-preview', FramePreview);
  customElements.define('presentation-toolbar', PresentationToolbar);
  customElements.define('edgeless-shape-menu', EdgelessShapeMenu);
  customElements.define('stroke-style-panel', StrokeStylePanel);
  customElements.define('edgeless-shape-tool-button', EdgelessShapeToolButton);
  customElements.define(
    'edgeless-connector-label-editor',
    EdgelessConnectorLabelEditor
  );
  customElements.define('block-zero-width', BlockZeroWidth);
  customElements.define(
    'edgeless-shape-tool-element',
    EdgelessShapeToolElement
  );
  customElements.define('edgeless-shape-text-editor', EdgelessShapeTextEditor);
  customElements.define(
    'edgeless-group-title-editor',
    EdgelessGroupTitleEditor
  );
  customElements.define(EDGELESS_TOOLBAR_WIDGET, EdgelessToolbarWidget);
  customElements.define('edgeless-shape-style-panel', EdgelessShapeStylePanel);
  customElements.define(
    'edgeless-frame-title-editor',
    EdgelessFrameTitleEditor
  );
  customElements.define('edgeless-text-editor', EdgelessTextEditor);
  customElements.define('affine-image-toolbar', AffineImageToolbar);
  customElements.define('affine-block-selection', BlockSelection);
  customElements.define('edgeless-slide-menu', EdgelessSlideMenu);
  customElements.define(
    'edgeless-toolbar-shape-draggable',
    EdgelessToolbarShapeDraggable
  );

  customElements.define(AFFINE_AI_PANEL_WIDGET, AffineAIPanelWidget);
  customElements.define(AFFINE_EMBED_CARD_TOOLBAR_WIDGET, EmbedCardToolbar);
  customElements.define(AFFINE_INNER_MODAL_WIDGET, AffineInnerModalWidget);
  customElements.define(AFFINE_MODAL_WIDGET, AffineModalWidget);
  customElements.define(
    AFFINE_PAGE_DRAGGING_AREA_WIDGET,
    AffinePageDraggingAreaWidget
  );
  customElements.define(AFFINE_EDGELESS_COPILOT_WIDGET, EdgelessCopilotWidget);

  customElements.define(AFFINE_IMAGE_TOOLBAR_WIDGET, AffineImageToolbarWidget);
  customElements.define(AFFINE_SLASH_MENU_WIDGET, AffineSlashMenuWidget);
  customElements.define(
    AFFINE_VIEWPORT_OVERLAY_WIDGET,
    AffineViewportOverlayWidget
  );
  customElements.define(
    AFFINE_EDGELESS_ZOOM_TOOLBAR_WIDGET,
    AffineEdgelessZoomToolbarWidget
  );
  customElements.define(AFFINE_SURFACE_REF_TOOLBAR, AffineSurfaceRefToolbar);
  customElements.define(
    AFFINE_EDGELESS_AUTO_CONNECT_WIDGET,
    EdgelessAutoConnectWidget
  );
  customElements.define(AFFINE_FORMAT_BAR_WIDGET, AffineFormatBarWidget);
}

declare global {
  namespace BlockSuite {
    interface CommandContext {
      focusBlock?: BlockComponent | null;
      anchorBlock?: BlockComponent | null;
      updatedBlocks?: BlockModel[];
    }
    interface BlockConfigs {
      'affine:page': RootBlockConfig;
    }
    interface BlockServices {
      'affine:page': RootService;
    }
  }
}
