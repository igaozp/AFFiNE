import { NoteDisplayMode } from '@blocksuite/affine-model';
import { matchFlavours } from '@blocksuite/affine-shared/utils';
import type { Command } from '@blocksuite/block-std';

export const changeNoteDisplayMode: Command<{
  noteId: string;
  mode: NoteDisplayMode;
  stopCapture?: boolean;
}> = (ctx, next) => {
  const { std, noteId, mode, stopCapture } = ctx;

  const noteBlockModel = std.store.getBlock(noteId)?.model;
  if (!noteBlockModel || !matchFlavours(noteBlockModel, ['affine:note']))
    return;

  const currentMode = noteBlockModel.displayMode;
  if (currentMode === mode) return;

  if (stopCapture) std.store.captureSync();

  // Update the order in the note list in its parent, for example
  // 1. Both mode note               |   1. Both mode note
  // 2. Page mode note               |   2. Page mode note
  // ----------------------------    |-> 3. the changed note (Both or Page)
  // 3. Edgeless mode note           |   ---------------------------
  // 4. the changing edgeless note  -|   4. Edgeless mode note
  const parent = std.store.getParent(noteBlockModel);
  if (parent) {
    const notes = parent.children.filter(child =>
      matchFlavours(child, ['affine:note'])
    );
    const firstEdgelessOnlyNote = notes.find(
      note => note.displayMode === NoteDisplayMode.EdgelessOnly
    );
    const lastPageVisibleNote = notes.findLast(
      note => note.displayMode !== NoteDisplayMode.EdgelessOnly
    );

    if (currentMode === NoteDisplayMode.EdgelessOnly) {
      std.store.moveBlocks(
        [noteBlockModel],
        parent,
        lastPageVisibleNote ?? firstEdgelessOnlyNote,
        lastPageVisibleNote ? false : true
      );
    } else if (mode === NoteDisplayMode.EdgelessOnly) {
      std.store.moveBlocks(
        [noteBlockModel],
        parent,
        firstEdgelessOnlyNote ?? lastPageVisibleNote,
        firstEdgelessOnlyNote ? true : false
      );
    }
  }

  std.store.updateBlock(noteBlockModel, {
    displayMode: mode,
  });

  return next();
};
