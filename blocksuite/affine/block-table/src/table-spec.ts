import { TableModelFlavour } from '@blocksuite/affine-model';
import {
  BlockViewExtension,
  CommandExtension,
  FlavourExtension,
} from '@blocksuite/block-std';
import type { ExtensionType } from '@blocksuite/store';
import { literal } from 'lit/static-html.js';

import { TableBlockAdapterExtensions } from './adapters/extension.js';
import { tableCommands } from './commands.js';

export const TableBlockSpec: ExtensionType[] = [
  FlavourExtension(TableModelFlavour),
  CommandExtension(tableCommands),
  BlockViewExtension(TableModelFlavour, literal`affine-table`),
  TableBlockAdapterExtensions,
].flat();
