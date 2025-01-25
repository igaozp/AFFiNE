import { AttachmentBlockComponent } from './attachment-block';
import { AttachmentEdgelessBlockComponent } from './attachment-edgeless-block';
import type { AttachmentBlockService } from './attachment-service';

export function effects() {
  customElements.define(
    'affine-edgeless-attachment',
    AttachmentEdgelessBlockComponent
  );
  customElements.define('affine-attachment', AttachmentBlockComponent);
}

declare global {
  namespace BlockSuite {
    interface BlockServices {
      'affine:attachment': AttachmentBlockService;
    }
  }
}
