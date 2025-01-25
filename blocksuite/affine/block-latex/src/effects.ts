import type { insertLatexBlockCommand } from './commands';
import { LatexBlockComponent } from './latex-block';

export function effects() {
  customElements.define('affine-latex', LatexBlockComponent);
}

declare global {
  namespace BlockSuite {
    interface CommandContext {
      insertedLatexBlockId?: Promise<string>;
    }

    interface Commands {
      /**
       * insert a LaTeX block after or before the current block selection
       * @param latex the LaTeX content. A input dialog will be shown if not provided
       * @param place where to insert the LaTeX block
       * @param removeEmptyLine remove the current block if it is empty
       * @returns the id of the inserted LaTeX block
       */
      insertLatexBlock: typeof insertLatexBlockCommand;
    }
  }
}
