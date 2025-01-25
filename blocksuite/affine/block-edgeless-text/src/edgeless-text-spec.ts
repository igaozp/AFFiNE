import { BlockViewExtension, CommandExtension } from '@blocksuite/block-std';
import type { ExtensionType } from '@blocksuite/store';
import { literal } from 'lit/static-html.js';

import { commands } from './commands/index.js';

export const EdgelessTextBlockSpec: ExtensionType[] = [
  CommandExtension(commands),
  BlockViewExtension('affine:edgeless-text', literal`affine-edgeless-text`),
];
