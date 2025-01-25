import { BlockViewExtension, FlavourExtension } from '@blocksuite/block-std';
import type { ExtensionType } from '@blocksuite/store';
import { literal } from 'lit/static-html.js';

import { EmbedFigmaBlockAdapterExtensions } from './adapters/extension.js';
import { EmbedFigmaBlockService } from './embed-figma-service.js';

export const EmbedFigmaBlockSpec: ExtensionType[] = [
  FlavourExtension('affine:embed-figma'),
  EmbedFigmaBlockService,
  BlockViewExtension('affine:embed-figma', model => {
    return model.parent?.flavour === 'affine:surface'
      ? literal`affine-embed-edgeless-figma-block`
      : literal`affine-embed-figma-block`;
  }),
  EmbedFigmaBlockAdapterExtensions,
].flat();
