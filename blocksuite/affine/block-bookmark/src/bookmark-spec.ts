import { BlockViewExtension, FlavourExtension } from '@blocksuite/block-std';
import type { ExtensionType } from '@blocksuite/store';
import { literal } from 'lit/static-html.js';

import { BookmarkBlockAdapterExtensions } from './adapters/extension.js';

export const BookmarkBlockSpec: ExtensionType[] = [
  FlavourExtension('affine:bookmark'),
  BlockViewExtension('affine:bookmark', model => {
    return model.parent?.flavour === 'affine:surface'
      ? literal`affine-edgeless-bookmark`
      : literal`affine-bookmark`;
  }),
  BookmarkBlockAdapterExtensions,
].flat();
