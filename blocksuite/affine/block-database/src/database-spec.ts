import { BlockViewExtension, FlavourExtension } from '@blocksuite/block-std';
import type { ExtensionType } from '@blocksuite/store';
import { literal } from 'lit/static-html.js';

import { DatabaseBlockAdapterExtensions } from './adapters/extension.js';

export const DatabaseBlockSpec: ExtensionType[] = [
  FlavourExtension('affine:database'),
  BlockViewExtension('affine:database', literal`affine-database`),
  DatabaseBlockAdapterExtensions,
].flat();
