import type { NoteBlockModel } from '@blocksuite/affine-model';
import { type BlockStdScope, ConfigExtension } from '@blocksuite/block-std';
import type { TemplateResult } from 'lit';

type NoteBlockContext = {
  note: NoteBlockModel;
  std: BlockStdScope;
};

export type NoteConfig = {
  edgelessNoteHeader: (context: NoteBlockContext) => TemplateResult;
  pageBlockTitle: (context: NoteBlockContext) => TemplateResult;
};

export function NoteConfigExtension(config: NoteConfig) {
  return ConfigExtension('affine:note', config);
}
