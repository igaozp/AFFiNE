import type * as SurfaceEffects from '@blocksuite/affine-block-surface/effects';

import { EmbedFigmaBlockComponent } from './embed-figma-block';
import { EmbedEdgelessBlockComponent } from './embed-figma-block/embed-edgeless-figma-block';
import type { EmbedFigmaBlockService } from './embed-figma-block/embed-figma-service';
import {
  EmbedGithubBlockComponent,
  type EmbedGithubBlockService,
} from './embed-github-block';
import { EmbedEdgelessGithubBlockComponent } from './embed-github-block/embed-edgeless-github-block';
import { EmbedHtmlBlockComponent } from './embed-html-block';
import { EmbedHtmlFullscreenToolbar } from './embed-html-block/components/fullscreen-toolbar';
import { EmbedEdgelessHtmlBlockComponent } from './embed-html-block/embed-edgeless-html-block';
import { EmbedLinkedDocBlockComponent } from './embed-linked-doc-block';
import type {
  InsertedLinkType,
  insertEmbedLinkedDocCommand,
} from './embed-linked-doc-block/commands/insert-embed-linked-doc';
import { EmbedEdgelessLinkedDocBlockComponent } from './embed-linked-doc-block/embed-edgeless-linked-doc-block';
import {
  EmbedLoomBlockComponent,
  type EmbedLoomBlockService,
} from './embed-loom-block';
import { EmbedEdgelessLoomBlockComponent } from './embed-loom-block/embed-edgeless-loom-bock';
import { EmbedSyncedDocBlockComponent } from './embed-synced-doc-block';
import { EmbedSyncedDocCard } from './embed-synced-doc-block/components/embed-synced-doc-card';
import { EmbedEdgelessSyncedDocBlockComponent } from './embed-synced-doc-block/embed-edgeless-synced-doc-block';
import {
  EmbedYoutubeBlockComponent,
  type EmbedYoutubeBlockService,
} from './embed-youtube-block';
import { EmbedEdgelessYoutubeBlockComponent } from './embed-youtube-block/embed-edgeless-youtube-block';

export function effects() {
  customElements.define(
    'affine-embed-edgeless-figma-block',
    EmbedEdgelessBlockComponent
  );
  customElements.define('affine-embed-figma-block', EmbedFigmaBlockComponent);

  customElements.define('affine-embed-html-block', EmbedHtmlBlockComponent);
  customElements.define(
    'affine-embed-edgeless-html-block',
    EmbedEdgelessHtmlBlockComponent
  );

  customElements.define(
    'embed-html-fullscreen-toolbar',
    EmbedHtmlFullscreenToolbar
  );
  customElements.define(
    'affine-embed-edgeless-github-block',
    EmbedEdgelessGithubBlockComponent
  );
  customElements.define('affine-embed-github-block', EmbedGithubBlockComponent);

  customElements.define(
    'affine-embed-edgeless-youtube-block',
    EmbedEdgelessYoutubeBlockComponent
  );
  customElements.define(
    'affine-embed-youtube-block',
    EmbedYoutubeBlockComponent
  );

  customElements.define(
    'affine-embed-edgeless-loom-block',
    EmbedEdgelessLoomBlockComponent
  );
  customElements.define('affine-embed-loom-block', EmbedLoomBlockComponent);

  customElements.define('affine-embed-synced-doc-card', EmbedSyncedDocCard);

  customElements.define(
    'affine-embed-edgeless-linked-doc-block',
    EmbedEdgelessLinkedDocBlockComponent
  );
  customElements.define(
    'affine-embed-linked-doc-block',
    EmbedLinkedDocBlockComponent
  );

  customElements.define(
    'affine-embed-edgeless-synced-doc-block',
    EmbedEdgelessSyncedDocBlockComponent
  );
  customElements.define(
    'affine-embed-synced-doc-block',
    EmbedSyncedDocBlockComponent
  );
}

declare type _GLOBAL = typeof SurfaceEffects;

declare global {
  interface HTMLElementTagNameMap {
    'affine-embed-figma-block': EmbedFigmaBlockComponent;
    'affine-embed-edgeless-figma-block': EmbedEdgelessBlockComponent;
    'affine-embed-github-block': EmbedGithubBlockComponent;
    'affine-embed-edgeless-github-block': EmbedEdgelessGithubBlockComponent;
    'affine-embed-html-block': EmbedHtmlBlockComponent;
    'affine-embed-edgeless-html-block': EmbedEdgelessHtmlBlockComponent;
    'embed-html-fullscreen-toolbar': EmbedHtmlFullscreenToolbar;
    'affine-embed-edgeless-loom-block': EmbedEdgelessLoomBlockComponent;
    'affine-embed-loom-block': EmbedLoomBlockComponent;
    'affine-embed-youtube-block': EmbedYoutubeBlockComponent;
    'affine-embed-edgeless-youtube-block': EmbedEdgelessYoutubeBlockComponent;
    'affine-embed-synced-doc-card': EmbedSyncedDocCard;
    'affine-embed-synced-doc-block': EmbedSyncedDocBlockComponent;
    'affine-embed-edgeless-synced-doc-block': EmbedEdgelessSyncedDocBlockComponent;
    'affine-embed-linked-doc-block': EmbedLinkedDocBlockComponent;
    'affine-embed-edgeless-linked-doc-block': EmbedEdgelessLinkedDocBlockComponent;
  }

  namespace BlockSuite {
    interface BlockServices {
      'affine:embed-figma': EmbedFigmaBlockService;
      'affine:embed-github': EmbedGithubBlockService;
      'affine:embed-loom': EmbedLoomBlockService;
      'affine:embed-youtube': EmbedYoutubeBlockService;
    }
    interface CommandContext {
      insertedLinkType?: Promise<InsertedLinkType>;
    }

    interface Commands {
      insertEmbedLinkedDoc: typeof insertEmbedLinkedDocCommand;
    }
  }
}
