import { BlockViewExtension, FlavourExtension } from '@blocksuite/block-std';
import type { ExtensionType } from '@blocksuite/store';
import { literal } from 'lit/static-html.js';

import { AttachmentBlockNotionHtmlAdapterExtension } from './adapters/notion-html.js';
import { AttachmentDropOption } from './attachment-service.js';
import {
  AttachmentEmbedConfigExtension,
  AttachmentEmbedService,
} from './embed.js';

export const AttachmentBlockSpec: ExtensionType[] = [
  FlavourExtension('affine:attachment'),
  BlockViewExtension('affine:attachment', model => {
    return model.parent?.flavour === 'affine:surface'
      ? literal`affine-edgeless-attachment`
      : literal`affine-attachment`;
  }),
  AttachmentDropOption,
  AttachmentEmbedConfigExtension(),
  AttachmentEmbedService,
  AttachmentBlockNotionHtmlAdapterExtension,
];
