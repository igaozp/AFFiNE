import type * as SurfaceEffects from '@blocksuite/affine-block-surface/effects';

declare type _GLOBAL_ = typeof SurfaceEffects;

export * from './adapters/notion-html';
export * from './attachment-block';
export * from './attachment-service';
export * from './attachment-spec';
export { attachmentViewToggleMenu } from './components/options';
export {
  type AttachmentEmbedConfig,
  AttachmentEmbedConfigIdentifier,
  AttachmentEmbedProvider,
} from './embed';
export { addAttachments, addSiblingAttachmentBlocks } from './utils';
