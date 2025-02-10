import { AttachmentBlockSpec } from '@blocksuite/affine-block-attachment';
import { BookmarkBlockSpec } from '@blocksuite/affine-block-bookmark';
import { CodeBlockSpec } from '@blocksuite/affine-block-code';
import { DataViewBlockSpec } from '@blocksuite/affine-block-data-view';
import {
  DatabaseBlockSpec,
  DatabaseSelectionExtension,
} from '@blocksuite/affine-block-database';
import { DividerBlockSpec } from '@blocksuite/affine-block-divider';
import { EdgelessTextBlockSpec } from '@blocksuite/affine-block-edgeless-text';
import { EmbedExtensions } from '@blocksuite/affine-block-embed';
import { FrameBlockSpec } from '@blocksuite/affine-block-frame';
import { ImageBlockSpec, ImageStoreSpec } from '@blocksuite/affine-block-image';
import { LatexBlockSpec } from '@blocksuite/affine-block-latex';
import { ListBlockSpec } from '@blocksuite/affine-block-list';
import {
  EdgelessNoteBlockSpec,
  NoteBlockSpec,
} from '@blocksuite/affine-block-note';
import { ParagraphBlockSpec } from '@blocksuite/affine-block-paragraph';
import {
  EdgelessSurfaceBlockSpec,
  PageSurfaceBlockSpec,
} from '@blocksuite/affine-block-surface';
import {
  EdgelessSurfaceRefBlockSpec,
  PageSurfaceRefBlockSpec,
} from '@blocksuite/affine-block-surface-ref';
import {
  TableBlockSpec,
  TableSelectionExtension,
} from '@blocksuite/affine-block-table';
import {
  RefNodeSlotsExtension,
  RichTextExtensions,
} from '@blocksuite/affine-components/rich-text';
import {
  HighlightSelectionExtension,
  ImageSelectionExtension,
} from '@blocksuite/affine-shared/selection';
import {
  DefaultOpenDocExtension,
  DocDisplayMetaService,
  EditPropsStore,
  FeatureFlagService,
  FileSizeLimitService,
  FontLoaderService,
  LinkPreviewerService,
} from '@blocksuite/affine-shared/services';
import {
  BlockSelectionExtension,
  CursorSelectionExtension,
  SurfaceSelectionExtension,
  TextSelectionExtension,
} from '@blocksuite/block-std';
import type { ExtensionType } from '@blocksuite/store';

import { AdapterFactoryExtensions } from '../_common/adapters/extension.js';

export const CommonBlockSpecs: ExtensionType[] = [
  DocDisplayMetaService,
  RefNodeSlotsExtension,
  EditPropsStore,
  RichTextExtensions,
  LatexBlockSpec,
  ListBlockSpec,
  DatabaseBlockSpec,
  TableBlockSpec,
  DataViewBlockSpec,
  DividerBlockSpec,
  BookmarkBlockSpec,
  EmbedExtensions,
  AttachmentBlockSpec,
  AdapterFactoryExtensions,
  CodeBlockSpec,
  ImageBlockSpec,
  ParagraphBlockSpec,
  DefaultOpenDocExtension,
].flat();

export const PageFirstPartyBlockSpecs: ExtensionType[] = [
  CommonBlockSpecs,
  NoteBlockSpec,
  PageSurfaceBlockSpec,
  PageSurfaceRefBlockSpec,
  FontLoaderService,
].flat();

export const EdgelessFirstPartyBlockSpecs: ExtensionType[] = [
  CommonBlockSpecs,

  EdgelessNoteBlockSpec,
  EdgelessSurfaceBlockSpec,
  EdgelessSurfaceRefBlockSpec,
  FrameBlockSpec,
  EdgelessTextBlockSpec,
  FontLoaderService,
].flat();

export const StoreExtensions: ExtensionType[] = [
  FeatureFlagService,
  BlockSelectionExtension,
  TextSelectionExtension,
  SurfaceSelectionExtension,
  CursorSelectionExtension,
  HighlightSelectionExtension,
  ImageSelectionExtension,
  DatabaseSelectionExtension,
  TableSelectionExtension,
  LinkPreviewerService,
  FileSizeLimitService,

  ImageStoreSpec,
].flat();
