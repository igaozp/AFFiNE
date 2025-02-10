import {
  BlockViewExtension,
  FlavourExtension,
  WidgetViewMapExtension,
} from '@blocksuite/block-std';
import type { ExtensionType } from '@blocksuite/store';
import { literal, unsafeStatic } from 'lit/static-html.js';

import { CodeBlockAdapterExtensions } from './adapters/extension.js';
import {
  CodeBlockInlineManagerExtension,
  CodeBlockUnitSpecExtension,
} from './code-block-inline.js';
import { CodeBlockService } from './code-block-service.js';
import { AFFINE_CODE_TOOLBAR_WIDGET } from './code-toolbar/index.js';

export const CodeBlockSpec: ExtensionType[] = [
  FlavourExtension('affine:code'),
  CodeBlockService,
  BlockViewExtension('affine:code', literal`affine-code`),
  WidgetViewMapExtension('affine:code', {
    codeToolbar: literal`${unsafeStatic(AFFINE_CODE_TOOLBAR_WIDGET)}`,
  }),
  CodeBlockInlineManagerExtension,
  CodeBlockUnitSpecExtension,
  CodeBlockAdapterExtensions,
].flat();
