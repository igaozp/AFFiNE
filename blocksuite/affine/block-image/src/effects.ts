import type { getImageSelectionsCommand } from '@blocksuite/affine-shared/commands';

import type { insertImagesCommand } from './commands/insert-images.js';
import { ImageBlockFallbackCard } from './components/image-block-fallback.js';
import { ImageBlockPageComponent } from './components/page-image-block.js';
import { ImageBlockComponent } from './image-block.js';
import { ImageEdgelessBlockComponent } from './image-edgeless-block.js';
import type { ImageBlockService } from './image-service.js';

export function effects() {
  customElements.define('affine-image', ImageBlockComponent);
  customElements.define('affine-edgeless-image', ImageEdgelessBlockComponent);
  customElements.define('affine-page-image', ImageBlockPageComponent);
  customElements.define('affine-image-fallback-card', ImageBlockFallbackCard);
}

declare global {
  namespace BlockSuite {
    interface CommandContext {
      insertedImageIds?: Promise<string[]>;
    }

    interface Commands {
      getImageSelections: typeof getImageSelectionsCommand;
      /**
       * open file dialog to insert images before or after the current block selection
       * @param removeEmptyLine remove the current block if it is empty
       * @param place where to insert the images
       * @returns a promise that resolves to the inserted image ids
       */
      insertImages: typeof insertImagesCommand;
    }

    interface BlockServices {
      'affine:image': ImageBlockService;
    }
  }
}
