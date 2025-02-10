import { BlockViewExtension, FlavourExtension } from '@blocksuite/block-std';
import type { ExtensionType } from '@blocksuite/store';
import { literal } from 'lit/static-html.js';

import {
  DocNoteBlockAdapterExtensions,
  EdgelessNoteBlockAdapterExtensions,
} from './adapters/index.js';
import { NoteBlockService } from './note-service.js';

export const NoteBlockSpec: ExtensionType[] = [
  FlavourExtension('affine:note'),
  NoteBlockService,
  BlockViewExtension('affine:note', literal`affine-note`),
  DocNoteBlockAdapterExtensions,
].flat();

export const EdgelessNoteBlockSpec: ExtensionType[] = [
  FlavourExtension('affine:note'),
  NoteBlockService,
  BlockViewExtension('affine:note', literal`affine-edgeless-note`),
  EdgelessNoteBlockAdapterExtensions,
].flat();
