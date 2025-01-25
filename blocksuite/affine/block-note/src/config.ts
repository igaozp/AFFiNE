import type { NoteBlockModel } from '@blocksuite/affine-model';
import { type BlockStdScope, ConfigExtension } from '@blocksuite/block-std';
import type { TemplateResult } from 'lit';

export type NoteConfig = {
  edgelessNoteHeader: (context: {
    note: NoteBlockModel;
    std: BlockStdScope;
  }) => TemplateResult;
};

export function NoteConfigExtension(config: NoteConfig) {
  return ConfigExtension('affine:note', config);
}
