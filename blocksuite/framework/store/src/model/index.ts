import type { BlockModel } from './block/block-model.js';

export * from './block/index.js';
export * from './doc.js';
export * from './store/index.js';
export * from './workspace.js';
export * from './workspace-meta.js';

declare global {
  namespace BlockSuite {
    interface BlockModels {}

    type Flavour = string & keyof BlockModels;

    type ModelProps<Model> = Partial<
      Model extends BlockModel<infer U> ? U : never
    >;
  }
}
