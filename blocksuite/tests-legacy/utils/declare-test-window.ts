import type { RefNodeSlotsProvider, TestUtils } from '@blocks/index.js';
import type {
  EditorHost,
  ExtensionType,
  WidgetViewMapIdentifier,
} from '@blocksuite/block-std';
import type { AffineEditorContainer } from '@blocksuite/presets';
import type { StarterDebugMenu } from '@playground/apps/_common/components/starter-debug-menu.js';
import type {
  BlockModel,
  Blocks,
  Transformer,
  Workspace,
} from '@store/index.js';

declare global {
  interface Window {
    /** Available on playground window
     * the following instance are initialized in `packages/playground/apps/starter/main.ts`
     */
    $blocksuite: {
      store: typeof import('../../framework/store/src/index.js');
      blocks: typeof import('../../blocks/src/index.js');
      global: {
        utils: typeof import('../../framework/global/src/utils.js');
      };
      editor: typeof import('../../presets/src/index.js');
      identifiers: {
        WidgetViewMapIdentifier: typeof WidgetViewMapIdentifier;
        QuickSearchProvider: typeof import('../../affine/shared/src/services/quick-search-service.js').QuickSearchProvider;
        DocModeProvider: typeof import('../../affine/shared/src/services/doc-mode-service.js').DocModeProvider;
        ThemeProvider: typeof import('../../affine/shared/src/services/theme-service.js').ThemeProvider;
        RefNodeSlotsProvider: typeof RefNodeSlotsProvider;
        ParseDocUrlService: typeof import('../../affine/shared/src/services/parse-url-service.js').ParseDocUrlProvider;
      };
      defaultExtensions: () => ExtensionType[];
      extensions: {
        WidgetViewMapExtension: typeof import('../../framework/block-std/src/extension/widget-view-map.js').WidgetViewMapExtension;
      };
      mockServices: {
        mockDocModeService: typeof import('../../playground/apps/_common/mock-services.js').mockDocModeService;
      };
    };
    collection: Workspace;
    blockSchema: Record<string, typeof BlockModel>;
    doc: Blocks;
    debugMenu: StarterDebugMenu;
    editor: AffineEditorContainer;
    host: EditorHost;
    testUtils: TestUtils;
    job: Transformer;
  }
}
