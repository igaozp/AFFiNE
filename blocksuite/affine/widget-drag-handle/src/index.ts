import type * as SurfaceEffects from '@blocksuite/affine-block-surface/effects';

declare type _GLOBAL_ = typeof SurfaceEffects;

export * from './consts';
export * from './drag-handle';
export * from './utils';
export type { DragBlockPayload } from './watchers/drag-event-watcher';
