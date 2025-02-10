import {
  BlockViewExtension,
  FlavourExtension,
  WidgetViewMapExtension,
} from '@blocksuite/block-std';
import type { ExtensionType } from '@blocksuite/store';
import { literal } from 'lit/static-html.js';

export const PageSurfaceRefBlockSpec: ExtensionType[] = [
  FlavourExtension('affine:surface-ref'),
  BlockViewExtension('affine:surface-ref', literal`affine-surface-ref`),
  WidgetViewMapExtension('affine:surface-ref', {
    surfaceToolbar: literal`affine-surface-ref-toolbar`,
  }),
];

export const EdgelessSurfaceRefBlockSpec: ExtensionType[] = [
  FlavourExtension('affine:surface-ref'),
  BlockViewExtension(
    'affine:surface-ref',
    literal`affine-edgeless-surface-ref`
  ),
];
