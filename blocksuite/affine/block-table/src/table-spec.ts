import { TableModelFlavour } from '@blocksuite/affine-model';
import { BlockViewExtension, FlavourExtension } from '@blocksuite/block-std';
import type { ExtensionType } from '@blocksuite/store';
import { literal } from 'lit/static-html.js';

import { TableBlockAdapterExtensions } from './adapters/extension.js';

export const TableBlockSpec: ExtensionType[] = [
  FlavourExtension(TableModelFlavour),
  BlockViewExtension(TableModelFlavour, literal`affine-table`),
  TableBlockAdapterExtensions,
].flat();
