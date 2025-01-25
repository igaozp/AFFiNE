import {
  BlockViewExtension,
  CommandExtension,
  FlavourExtension,
} from '@blocksuite/block-std';
import type { ExtensionType } from '@blocksuite/store';
import { literal } from 'lit/static-html.js';

import {
  EdgelessSurfaceBlockAdapterExtensions,
  SurfaceBlockAdapterExtensions,
} from './adapters/extension';
import { commands } from './commands';
import {
  EdgelessCRUDExtension,
  EdgelessLegacySlotExtension,
} from './extensions';
import { SurfaceBlockService } from './surface-service';
import { MindMapView } from './view/mindmap';

const CommonSurfaceBlockSpec: ExtensionType[] = [
  FlavourExtension('affine:surface'),
  SurfaceBlockService,
  CommandExtension(commands),
  MindMapView,
  EdgelessCRUDExtension,
  EdgelessLegacySlotExtension,
];

export const PageSurfaceBlockSpec: ExtensionType[] = [
  ...CommonSurfaceBlockSpec,
  ...SurfaceBlockAdapterExtensions,
  BlockViewExtension('affine:surface', literal`affine-surface-void`),
];

export const EdgelessSurfaceBlockSpec: ExtensionType[] = [
  ...CommonSurfaceBlockSpec,
  ...EdgelessSurfaceBlockAdapterExtensions,
  BlockViewExtension('affine:surface', literal`affine-surface`),
];
