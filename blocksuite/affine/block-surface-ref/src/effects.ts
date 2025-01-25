import type { insertSurfaceRefBlockCommand } from './commands.js';
import { SurfaceRefGenericBlockPortal } from './portal/generic-block.js';
import { SurfaceRefNotePortal } from './portal/note.js';
import { SurfaceRefBlockComponent } from './surface-ref-block.js';
import { EdgelessSurfaceRefBlockComponent } from './surface-ref-block-edgeless.js';

export function effects() {
  customElements.define(
    'surface-ref-generic-block-portal',
    SurfaceRefGenericBlockPortal
  );
  customElements.define('affine-surface-ref', SurfaceRefBlockComponent);
  customElements.define(
    'affine-edgeless-surface-ref',
    EdgelessSurfaceRefBlockComponent
  );
  customElements.define('surface-ref-note-portal', SurfaceRefNotePortal);
}

declare global {
  namespace BlockSuite {
    interface CommandContext {
      insertedSurfaceRefBlockId?: string;
    }

    interface Commands {
      /**
       * insert a SurfaceRef block after or before the current block selection
       * @param reference the reference block id. The block should be group or frame
       * @param place where to insert the LaTeX block
       * @param removeEmptyLine remove the current block if it is empty
       * @returns the id of the inserted SurfaceRef block
       */
      insertSurfaceRefBlock: typeof insertSurfaceRefBlockCommand;
    }
  }
}
