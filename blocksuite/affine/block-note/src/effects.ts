import type { BlockComponent } from '@blocksuite/block-std';
import type { BlockModel } from '@blocksuite/store';

import type { updateBlockType } from './commands/block-type';
import type { changeNoteDisplayMode } from './commands/change-note-display-mode';
import type { dedentBlock } from './commands/dedent-block';
import type { dedentBlockToRoot } from './commands/dedent-block-to-root';
import type { dedentBlocks } from './commands/dedent-blocks';
import type { dedentBlocksToRoot } from './commands/dedent-blocks-to-root';
import type { focusBlockEnd } from './commands/focus-block-end';
import type { focusBlockStart } from './commands/focus-block-start';
import type { indentBlock } from './commands/indent-block';
import type { indentBlocks } from './commands/indent-blocks';
import type { selectBlock } from './commands/select-block';
import type { selectBlocksBetween } from './commands/select-blocks-between';
import type { NoteConfig } from './config';
import { NoteBlockComponent } from './note-block';
import {
  EdgelessNoteBlockComponent,
  EdgelessNoteMask,
} from './note-edgeless-block';
import type { NoteBlockService } from './note-service';

export function effects() {
  customElements.define('affine-note', NoteBlockComponent);
  customElements.define('edgeless-note-mask', EdgelessNoteMask);
  customElements.define('affine-edgeless-note', EdgelessNoteBlockComponent);
}

declare global {
  namespace BlockSuite {
    interface Commands {
      selectBlock: typeof selectBlock;
      selectBlocksBetween: typeof selectBlocksBetween;
      focusBlockStart: typeof focusBlockStart;
      focusBlockEnd: typeof focusBlockEnd;
      indentBlocks: typeof indentBlocks;
      dedentBlock: typeof dedentBlock;
      dedentBlocksToRoot: typeof dedentBlocksToRoot;
      dedentBlocks: typeof dedentBlocks;
      indentBlock: typeof indentBlock;
      updateBlockType: typeof updateBlockType;
      dedentBlockToRoot: typeof dedentBlockToRoot;
      changeNoteDisplayMode: typeof changeNoteDisplayMode;
    }
    interface CommandContext {
      focusBlock?: BlockComponent | null;
      anchorBlock?: BlockComponent | null;
      updatedBlocks?: BlockModel[];
    }
    interface BlockServices {
      'affine:note': NoteBlockService;
    }
    interface BlockConfigs {
      'affine:note': NoteConfig;
    }
  }
}
