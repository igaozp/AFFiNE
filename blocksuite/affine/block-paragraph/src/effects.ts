import { effects as ParagraphHeadingIconEffects } from './heading-icon.js';
import { ParagraphBlockComponent } from './paragraph-block.js';
import type { ParagraphBlockService } from './paragraph-service.js';

export function effects() {
  ParagraphHeadingIconEffects();
  customElements.define('affine-paragraph', ParagraphBlockComponent);
}

declare global {
  namespace BlockSuite {
    interface BlockServices {
      'affine:paragraph': ParagraphBlockService;
    }
  }
  interface HTMLElementTagNameMap {
    'affine-paragraph': ParagraphBlockComponent;
  }
}
