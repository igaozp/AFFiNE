/* oxlint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="./effects.ts" />
import { matchFlavours } from '@blocksuite/affine-shared/utils';
import { deserializeXYWH, Point } from '@blocksuite/global/utils';

import { splitElements } from './root-block/edgeless/utils/clipboard-utils.js';
import { isCanvasElement } from './root-block/edgeless/utils/query.js';

export * from './_common/adapters/index.js';
export { type NavigatorMode } from './_common/edgeless/frame/consts.js';
export {
  ExportManager,
  ExportManagerExtension,
} from './_common/export-manager/export-manager.js';
export * from './_common/test-utils/test-utils.js';
export * from './_common/transformers/index.js';
export { type AbstractEditor } from './_common/types.js';
export * from './_specs/index.js';
export { EdgelessTemplatePanel } from './root-block/edgeless/components/toolbar/template/template-panel.js';
export type {
  Template,
  TemplateCategory,
  TemplateManager,
} from './root-block/edgeless/components/toolbar/template/template-type.js';
export {
  EdgelessFrameManager,
  FrameOverlay,
} from './root-block/edgeless/frame-manager.js';
export { CopilotTool } from './root-block/edgeless/gfx-tool/copilot-tool.js';
export * from './root-block/edgeless/gfx-tool/index.js';
export { EditPropsMiddlewareBuilder } from './root-block/edgeless/middlewares/base.js';
export { EdgelessSnapManager } from './root-block/edgeless/utils/snap-manager.js';
export * from './root-block/index.js';
export * from './schemas.js';
export * from '@blocksuite/affine-block-attachment';
export * from '@blocksuite/affine-block-bookmark';
export * from '@blocksuite/affine-block-code';
export * from '@blocksuite/affine-block-data-view';
export * from '@blocksuite/affine-block-database';
export * from '@blocksuite/affine-block-divider';
export * from '@blocksuite/affine-block-edgeless-text';
export * from '@blocksuite/affine-block-embed';
export * from '@blocksuite/affine-block-frame';
export * from '@blocksuite/affine-block-image';
export * from '@blocksuite/affine-block-latex';
export * from '@blocksuite/affine-block-list';
export * from '@blocksuite/affine-block-note';
export * from '@blocksuite/affine-block-paragraph';
export * from '@blocksuite/affine-block-surface';
export * from '@blocksuite/affine-block-surface-ref';
export * from '@blocksuite/affine-block-table';
export {
  type AIError,
  type AIItemConfig,
  type AIItemGroupConfig,
  AIItemList,
  type AISubItemConfig,
  GeneralNetworkError,
  PaymentRequiredError,
  UnauthorizedError,
} from '@blocksuite/affine-components/ai-item';
export {
  menu,
  type MenuOptions,
  onMenuOpen,
} from '@blocksuite/affine-components/context-menu';
export {
  HoverController,
  whenHover,
} from '@blocksuite/affine-components/hover';
export {
  ArrowDownSmallIcon,
  CloseIcon,
  DocIcon,
  DualLinkIcon16,
  LinkedDocIcon,
  PlusIcon,
  TagsIcon,
} from '@blocksuite/affine-components/icons';
export * from '@blocksuite/affine-components/icons';
export * from '@blocksuite/affine-components/peek';
export {
  createLitPortal,
  createSimplePortal,
} from '@blocksuite/affine-components/portal';
export * from '@blocksuite/affine-components/rich-text';
export { toast } from '@blocksuite/affine-components/toast';
export {
  type AdvancedMenuItem,
  type FatMenuItems,
  groupsToActions,
  MenuContext,
  type MenuItem,
  type MenuItemGroup,
  renderActions,
  renderGroups,
  renderToolbarSeparator,
  Tooltip,
} from '@blocksuite/affine-components/toolbar';
export * from '@blocksuite/affine-model';
export {
  AttachmentAdapter,
  AttachmentAdapterFactoryExtension,
  AttachmentAdapterFactoryIdentifier,
  FetchUtils,
  HtmlAdapter,
  HtmlAdapterFactoryExtension,
  HtmlAdapterFactoryIdentifier,
  ImageAdapter,
  ImageAdapterFactoryExtension,
  ImageAdapterFactoryIdentifier,
  MarkdownAdapter,
  MarkdownAdapterFactoryExtension,
  MarkdownAdapterFactoryIdentifier,
  MixTextAdapter,
  MixTextAdapterFactoryExtension,
  MixTextAdapterFactoryIdentifier,
  NotionTextAdapter,
  NotionTextAdapterFactoryExtension,
  NotionTextAdapterFactoryIdentifier,
  PlainTextAdapter,
  PlainTextAdapterFactoryExtension,
  PlainTextAdapterFactoryIdentifier,
} from '@blocksuite/affine-shared/adapters';
export { HighlightSelection } from '@blocksuite/affine-shared/selection';
export * from '@blocksuite/affine-shared/services';
export { scrollbarStyle } from '@blocksuite/affine-shared/styles';
export {
  ColorVariables,
  FontFamilyVariables,
  SizeVariables,
  StyleVariables,
  unsafeCSSVarV2,
} from '@blocksuite/affine-shared/theme';
export { type AffineTextAttributes } from '@blocksuite/affine-shared/types';
export {
  createButtonPopper,
  createDefaultDoc,
  createSignalFromObservable,
  findNoteBlockModel,
  getLastNoteBlock,
  isInsideEdgelessEditor,
  isInsidePageEditor,
  matchFlavours,
  on,
  once,
  openFileOrFiles,
  printToPdf,
  referenceToNode,
  type Signal,
  SpecProvider,
} from '@blocksuite/affine-shared/utils';
export type { DragBlockPayload } from '@blocksuite/affine-widget-drag-handle';

export const BlocksUtils = {
  splitElements,
  matchFlavours,
  deserializeXYWH,
  isCanvasElement,
  Point,
};

const env: Record<string, unknown> =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined'
      ? window
      : typeof global !== 'undefined'
        ? global
        : {};
const importIdentifier = '__ $BLOCKSUITE_BLOCKS$ __';

if (env[importIdentifier] === true) {
  // https://github.com/yjs/yjs/issues/438
  console.error(
    '@blocksuite/blocks was already imported. This breaks constructor checks and will lead to issues!'
  );
}

env[importIdentifier] = true;
