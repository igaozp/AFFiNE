import '../../style.css';

import {
  WidgetViewMapExtension,
  WidgetViewMapIdentifier,
} from '@blocksuite/block-std';
import * as blocks from '@blocksuite/blocks';
import {
  CommunityCanvasTextFonts,
  DocModeProvider,
  FontConfigExtension,
  ParseDocUrlProvider,
  QuickSearchProvider,
  RefNodeSlotsProvider,
} from '@blocksuite/blocks';
import { effects as blocksEffects } from '@blocksuite/blocks/effects';
import * as globalUtils from '@blocksuite/global/utils';
import * as editor from '@blocksuite/presets';
import { effects as presetsEffects } from '@blocksuite/presets/effects';
import type { ExtensionType } from '@blocksuite/store';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import * as store from '@blocksuite/store';

import {
  mockDocModeService,
  mockEditorSetting,
} from '../_common/mock-services.js';
import { setupEdgelessTemplate } from '../_common/setup.js';
import {
  createStarterDocCollection,
  initStarterDocCollection,
} from './utils/collection.js';
import { mountDefaultDocEditor } from './utils/editor.js';

blocksEffects();
presetsEffects();

async function main() {
  if (window.collection) return;

  setupEdgelessTemplate();

  const params = new URLSearchParams(location.search);
  const room = params.get('room') ?? Math.random().toString(16).slice(2, 8);
  const isE2E = room.startsWith('playwright');
  const collection = createStarterDocCollection();

  if (isE2E) {
    Object.defineProperty(window, '$blocksuite', {
      value: Object.freeze({
        store,
        blocks,
        global: { utils: globalUtils },
        editor,
        identifiers: {
          WidgetViewMapIdentifier,
          QuickSearchProvider,
          DocModeProvider,
          RefNodeSlotsProvider,
          ParseDocUrlService: ParseDocUrlProvider,
        },
        defaultExtensions: (): ExtensionType[] => [
          FontConfigExtension(CommunityCanvasTextFonts),
          blocks.EditorSettingExtension(mockEditorSetting()),
        ],
        extensions: {
          FontConfigExtension: FontConfigExtension(CommunityCanvasTextFonts),
          WidgetViewMapExtension,
        },
        mockServices: {
          mockDocModeService,
        },
      }),
    });

    return;
  }

  await initStarterDocCollection(collection);
  await mountDefaultDocEditor(collection);
}

main().catch(console.error);
