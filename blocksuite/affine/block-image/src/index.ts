import type * as SurfaceEffects from '@blocksuite/affine-block-surface/effects';

declare type _GLOBAL_ = typeof SurfaceEffects;

export * from './adapters';
export * from './image-block';
export * from './image-edgeless-block';
export * from './image-service';
export * from './image-spec';
export * from './styles';
export { addImages, downloadImageBlob, uploadBlobForImage } from './utils';
export { ImageSelection } from '@blocksuite/affine-shared/selection';
