import type { insertEdgelessTextCommand } from './commands/insert-edgeless-text';
import { EdgelessTextBlockComponent } from './edgeless-text-block';

export function effects() {
  customElements.define('affine-edgeless-text', EdgelessTextBlockComponent);
}

declare global {
  namespace BlockSuite {
    interface CommandContext {
      textId?: string;
    }
    interface Commands {
      insertEdgelessText: typeof insertEdgelessTextCommand;
    }
  }
}
