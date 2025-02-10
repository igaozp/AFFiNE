import { BlockViewExtension } from '@blocksuite/block-std';
import type { ExtensionType } from '@blocksuite/store';
import { literal } from 'lit/static-html.js';

import { LatexBlockAdapterExtensions } from './adapters/extension.js';

export const LatexBlockSpec: ExtensionType[] = [
  BlockViewExtension('affine:latex', literal`affine-latex`),
  LatexBlockAdapterExtensions,
].flat();
