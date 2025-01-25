import {
  BlocksUtils,
  matchFlavours,
  type NoteBlockModel,
  NoteDisplayMode,
  type ParagraphBlockModel,
  type RootBlockModel,
} from '@blocksuite/blocks';
import type { BlockModel, Store } from '@blocksuite/store';

import { headingKeys } from '../config.js';

export function getNotesFromDoc(
  doc: Store,
  modes: NoteDisplayMode[] = [
    NoteDisplayMode.DocAndEdgeless,
    NoteDisplayMode.DocOnly,
    NoteDisplayMode.EdgelessOnly,
  ]
) {
  const rootModel = doc.root;
  if (!rootModel) return [];

  const notes: NoteBlockModel[] = [];

  rootModel.children.forEach(block => {
    if (!matchFlavours(block, ['affine:note'])) return;

    if (modes.includes(block.displayMode$.value)) {
      notes.push(block);
    }
  });

  return notes;
}

export function isRootBlock(block: BlockModel): block is RootBlockModel {
  return BlocksUtils.matchFlavours(block, ['affine:page']);
}

export function isHeadingBlock(
  block: BlockModel
): block is ParagraphBlockModel {
  return (
    BlocksUtils.matchFlavours(block, ['affine:paragraph']) &&
    headingKeys.has(block.type$.value)
  );
}

export function getHeadingBlocksFromNote(
  note: NoteBlockModel,
  ignoreEmpty = false
) {
  const models = note.children.filter(block => {
    const empty = block.text && block.text.length > 0;
    return isHeadingBlock(block) && (!ignoreEmpty || empty);
  });

  return models;
}

export function getHeadingBlocksFromDoc(
  doc: Store,
  modes: NoteDisplayMode[] = [
    NoteDisplayMode.DocAndEdgeless,
    NoteDisplayMode.DocOnly,
    NoteDisplayMode.EdgelessOnly,
  ],
  ignoreEmpty = false
) {
  const notes = getNotesFromDoc(doc, modes);
  return notes.map(note => getHeadingBlocksFromNote(note, ignoreEmpty)).flat();
}
