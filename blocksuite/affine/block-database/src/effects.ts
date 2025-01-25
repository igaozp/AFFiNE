import type { insertDatabaseBlockCommand } from './commands';
import { CenterPeek } from './components/layout';
import { DatabaseTitle } from './components/title';
import type { DatabaseOptionsConfig } from './config';
import { DatabaseBlockComponent } from './database-block';
import { BlockRenderer } from './detail-panel/block-renderer';
import { NoteRenderer } from './detail-panel/note-renderer';
import { LinkCell, LinkCellEditing } from './properties/link/cell-renderer';
import { LinkNode } from './properties/link/components/link-node';
import {
  RichTextCell,
  RichTextCellEditing,
} from './properties/rich-text/cell-renderer';
import { IconCell } from './properties/title/icon';
import {
  HeaderAreaTextCell,
  HeaderAreaTextCellEditing,
} from './properties/title/text';

export function effects() {
  customElements.define('affine-database-title', DatabaseTitle);
  customElements.define('data-view-header-area-icon', IconCell);
  customElements.define('affine-database-link-cell', LinkCell);
  customElements.define('affine-database-link-cell-editing', LinkCellEditing);
  customElements.define('data-view-header-area-text', HeaderAreaTextCell);
  customElements.define(
    'data-view-header-area-text-editing',
    HeaderAreaTextCellEditing
  );
  customElements.define('affine-database-rich-text-cell', RichTextCell);
  customElements.define(
    'affine-database-rich-text-cell-editing',
    RichTextCellEditing
  );
  customElements.define('center-peek', CenterPeek);
  customElements.define('database-datasource-note-renderer', NoteRenderer);
  customElements.define('database-datasource-block-renderer', BlockRenderer);
  customElements.define('affine-database-link-node', LinkNode);
  customElements.define('affine-database', DatabaseBlockComponent);
}

declare global {
  namespace BlockSuite {
    interface BlockConfigs {
      'affine:database': Partial<DatabaseOptionsConfig>;
    }

    interface CommandContext {
      insertedDatabaseBlockId?: string;
    }

    interface Commands {
      /**
       * insert a database block after or before the current block selection
       * @param latex the LaTeX content. A input dialog will be shown if not provided
       * @param removeEmptyLine remove the current block if it is empty
       * @param place where to insert the LaTeX block
       * @returns the id of the inserted LaTeX block
       */
      insertDatabaseBlock: typeof insertDatabaseBlockCommand;
    }
  }
}
