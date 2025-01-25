import {
  BlockServiceWatcher,
  WidgetViewMapIdentifier,
} from '@blocksuite/affine/block-std';
import {
  AFFINE_AI_PANEL_WIDGET,
  AFFINE_EDGELESS_COPILOT_WIDGET,
  AffineAIPanelWidget,
  AffineCodeToolbarWidget,
  AffineFormatBarWidget,
  AffineImageToolbarWidget,
  AffineSlashMenuWidget,
  CodeBlockSpec,
  EdgelessCopilotWidget,
  EdgelessElementToolbarWidget,
  EdgelessRootBlockSpec,
  edgelessRootWidgetViewMap,
  ImageBlockSpec,
  PageRootBlockSpec,
  pageRootWidgetViewMap,
  ParagraphBlockService,
  ParagraphBlockSpec,
} from '@blocksuite/affine/blocks';
import { assertInstanceOf } from '@blocksuite/affine/global/utils';
import type { ExtensionType } from '@blocksuite/affine/store';
import type { FrameworkProvider } from '@toeverything/infra';
import { literal, unsafeStatic } from 'lit/static-html.js';

import { buildAIPanelConfig } from './ai-panel';
import { setupCodeToolbarAIEntry } from './entries/code-toolbar/setup-code-toolbar';
import {
  setupEdgelessCopilot,
  setupEdgelessElementToolbarAIEntry,
} from './entries/edgeless/index';
import { setupFormatBarAIEntry } from './entries/format-bar/setup-format-bar';
import { setupImageToolbarAIEntry } from './entries/image-toolbar/setup-image-toolbar';
import { setupSlashMenuAIEntry } from './entries/slash-menu/setup-slash-menu';
import { setupSpaceAIEntry } from './entries/space/setup-space';

function getAIPageRootWatcher(framework: FrameworkProvider) {
  class AIPageRootWatcher extends BlockServiceWatcher {
    static override readonly flavour = 'affine:page';

    override mounted() {
      super.mounted();
      this.blockService.specSlots.widgetConnected.on(view => {
        if (view.component instanceof AffineAIPanelWidget) {
          view.component.style.width = '630px';
          view.component.config = buildAIPanelConfig(view.component, framework);
          setupSpaceAIEntry(view.component);
        }

        if (view.component instanceof AffineFormatBarWidget) {
          setupFormatBarAIEntry(view.component);
        }

        if (view.component instanceof AffineSlashMenuWidget) {
          setupSlashMenuAIEntry(view.component);
        }
      });
    }
  }
  return AIPageRootWatcher;
}

export function createAIPageRootBlockSpec(
  framework: FrameworkProvider
): ExtensionType[] {
  return [
    ...PageRootBlockSpec,
    getAIPageRootWatcher(framework),
    {
      setup: di => {
        di.override(WidgetViewMapIdentifier('affine:page'), () => {
          return {
            ...pageRootWidgetViewMap,
            [AFFINE_AI_PANEL_WIDGET]: literal`${unsafeStatic(
              AFFINE_AI_PANEL_WIDGET
            )}`,
          };
        });
      },
    },
  ];
}

function getAIEdgelessRootWatcher(framework: FrameworkProvider) {
  class AIEdgelessRootWatcher extends BlockServiceWatcher {
    static override readonly flavour = 'affine:page';

    override mounted() {
      super.mounted();
      this.blockService.specSlots.widgetConnected.on(view => {
        if (view.component instanceof AffineAIPanelWidget) {
          view.component.style.width = '430px';
          view.component.config = buildAIPanelConfig(view.component, framework);
          setupSpaceAIEntry(view.component);
        }

        if (view.component instanceof EdgelessCopilotWidget) {
          setupEdgelessCopilot(view.component);
        }

        if (view.component instanceof EdgelessElementToolbarWidget) {
          setupEdgelessElementToolbarAIEntry(view.component);
        }

        if (view.component instanceof AffineFormatBarWidget) {
          setupFormatBarAIEntry(view.component);
        }

        if (view.component instanceof AffineSlashMenuWidget) {
          setupSlashMenuAIEntry(view.component);
        }
      });
    }
  }
  return AIEdgelessRootWatcher;
}

export function createAIEdgelessRootBlockSpec(
  framework: FrameworkProvider
): ExtensionType[] {
  return [
    ...EdgelessRootBlockSpec,
    getAIEdgelessRootWatcher(framework),
    {
      setup: di => {
        di.override(WidgetViewMapIdentifier('affine:page'), () => {
          return {
            ...edgelessRootWidgetViewMap,
            [AFFINE_EDGELESS_COPILOT_WIDGET]: literal`${unsafeStatic(
              AFFINE_EDGELESS_COPILOT_WIDGET
            )}`,
            [AFFINE_AI_PANEL_WIDGET]: literal`${unsafeStatic(
              AFFINE_AI_PANEL_WIDGET
            )}`,
          };
        });
      },
    },
  ];
}

class AIParagraphBlockWatcher extends BlockServiceWatcher {
  static override readonly flavour = 'affine:paragraph';

  override mounted() {
    super.mounted();
    const service = this.blockService;
    assertInstanceOf(service, ParagraphBlockService);
    service.placeholderGenerator = model => {
      if (model.type === 'text') {
        return "Type '/' for commands, 'space' for AI";
      }

      const placeholders = {
        h1: 'Heading 1',
        h2: 'Heading 2',
        h3: 'Heading 3',
        h4: 'Heading 4',
        h5: 'Heading 5',
        h6: 'Heading 6',
        quote: '',
      };
      return placeholders[model.type];
    };
  }
}

export const AIParagraphBlockSpec: ExtensionType[] = [
  ...ParagraphBlockSpec,
  AIParagraphBlockWatcher,
];

class AICodeBlockWatcher extends BlockServiceWatcher {
  static override readonly flavour = 'affine:code';

  override mounted() {
    super.mounted();
    const service = this.blockService;
    service.specSlots.widgetConnected.on(view => {
      if (view.component instanceof AffineCodeToolbarWidget) {
        setupCodeToolbarAIEntry(view.component);
      }
    });
  }
}

export const AICodeBlockSpec: ExtensionType[] = [
  ...CodeBlockSpec,
  AICodeBlockWatcher,
];

class AIImageBlockWatcher extends BlockServiceWatcher {
  static override readonly flavour = 'affine:image';

  override mounted() {
    super.mounted();
    this.blockService.specSlots.widgetConnected.on(view => {
      if (view.component instanceof AffineImageToolbarWidget) {
        setupImageToolbarAIEntry(view.component);
      }
    });
  }
}

export const AIImageBlockSpec: ExtensionType[] = [
  ...ImageBlockSpec,
  AIImageBlockWatcher,
];
