import {
  BlockViewExtension,
  CommandExtension,
  FlavourExtension,
} from '@blocksuite/block-std';
import type { ExtensionType } from '@blocksuite/store';
import { literal } from 'lit/static-html.js';

import { DatabaseBlockAdapterExtensions } from './adapters/extension.js';
import { commands } from './commands.js';

export const DatabaseBlockSpec: ExtensionType[] = [
  FlavourExtension('affine:database'),
  CommandExtension(commands),
  BlockViewExtension('affine:database', literal`affine-database`),
  DatabaseBlockAdapterExtensions,
].flat();
