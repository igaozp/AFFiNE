import { AINetworkSearchService } from '@affine/core/modules/ai-button/services/network-search';
import type { EditorHost } from '@blocksuite/affine/block-std';
import {
  type AffineAIPanelWidget,
  type AffineAIPanelWidgetConfig,
  type AIItemConfig,
  ImageBlockModel,
  isInsideEdgelessEditor,
  matchFlavours,
  NoteDisplayMode,
} from '@blocksuite/affine/blocks';
import { assertExists, Bound } from '@blocksuite/affine/global/utils';
import type { FrameworkProvider } from '@toeverything/infra';
import type { TemplateResult } from 'lit';

import { createTextRenderer, insertFromMarkdown } from '../_common';
import {
  AIPenIcon,
  AIStarIconWithAnimation,
  ChatWithAIIcon,
  CreateIcon,
  DiscardIcon,
  InsertBelowIcon,
  InsertTopIcon,
  ReplaceIcon,
  RetryIcon,
} from './_common/icons';
import {
  EXCLUDING_REPLACE_ACTIONS,
  INSERT_ABOVE_ACTIONS,
} from './actions/consts';
import {
  pageResponseHandler,
  replaceWithMarkdown,
} from './actions/page-response';
import { AIProvider } from './provider';
import { reportResponse } from './utils/action-reporter';
import { getAIPanelWidget } from './utils/ai-widgets';
import { AIContext } from './utils/context';
import { findNoteBlockModel, getService } from './utils/edgeless';
import { copyTextAnswer } from './utils/editor-actions';
import { getSelections } from './utils/selection-utils';

function asCaption<T extends keyof BlockSuitePresets.AIActions>(
  host: EditorHost,
  id?: T
): AIItemConfig {
  return {
    name: 'Use as caption',
    icon: AIPenIcon,
    showWhen: () => {
      const panel = getAIPanelWidget(host);
      return id === 'generateCaption' && !!panel.answer;
    },
    handler: () => {
      reportResponse('result:use-as-caption');
      const panel = getAIPanelWidget(host);
      const caption = panel.answer;
      if (!caption) return;

      const { selectedBlocks } = getSelections(host);
      if (!selectedBlocks || selectedBlocks.length !== 1) return;

      const imageBlock = selectedBlocks[0].model;
      if (!(imageBlock instanceof ImageBlockModel)) return;

      host.doc.updateBlock(imageBlock, { caption });
      panel.hide();
    },
  };
}

function createNewNote(host: EditorHost): AIItemConfig {
  return {
    name: 'Create new note',
    icon: CreateIcon,
    showWhen: () => {
      const panel = getAIPanelWidget(host);
      return !!panel.answer && isInsideEdgelessEditor(host);
    },
    handler: () => {
      reportResponse('result:add-note');
      // get the note block
      const { selectedBlocks } = getSelections(host);
      if (!selectedBlocks || !selectedBlocks.length) return;
      const firstBlock = selectedBlocks[0];
      const noteModel = findNoteBlockModel(firstBlock);
      if (!noteModel) return;

      // create a new note block at the left of the current note block
      const bound = Bound.deserialize(noteModel.xywh);
      const newBound = new Bound(bound.x - bound.w - 20, bound.y, bound.w, 72);
      const doc = host.doc;
      const panel = getAIPanelWidget(host);
      const service = getService(host);
      doc.transact(() => {
        assertExists(doc.root);
        const noteBlockId = doc.addBlock(
          'affine:note',
          {
            xywh: newBound.serialize(),
            displayMode: NoteDisplayMode.EdgelessOnly,
            index: service.generateIndex(),
          },
          doc.root.id
        );

        assertExists(panel.answer);
        insertFromMarkdown(host, panel.answer, doc, noteBlockId)
          .then(() => {
            service.selection.set({
              elements: [noteBlockId],
              editing: false,
            });

            // set the viewport to show the new note block and original note block
            const newNote = doc.getBlock(noteBlockId)?.model;
            if (!newNote || !matchFlavours(newNote, ['affine:note'])) return;
            const newNoteBound = Bound.deserialize(newNote.xywh);

            const bounds = [bound, newNoteBound];
            const { zoom, centerX, centerY } = service.getFitToScreenData(
              [20, 20, 20, 20],
              bounds
            );
            service.viewport.setViewport(zoom, [centerX, centerY]);
          })
          .catch(err => {
            console.error(err);
          });
      });
      // hide the panel
      panel.hide();
    },
  };
}

function buildPageResponseConfig<T extends keyof BlockSuitePresets.AIActions>(
  panel: AffineAIPanelWidget,
  id: T,
  ctx: AIContext
) {
  const host = panel.host;

  return [
    {
      name: 'Response',
      items: [
        {
          name: 'Insert below',
          icon: InsertBelowIcon,
          showWhen: () =>
            !!panel.answer && (!id || !INSERT_ABOVE_ACTIONS.includes(id)),
          handler: () => {
            reportResponse('result:insert');
            pageResponseHandler(id, host, ctx, 'after').catch(console.error);
            panel.hide();
          },
        },
        {
          name: 'Insert above',
          icon: InsertTopIcon,
          showWhen: () =>
            !!panel.answer && !!id && INSERT_ABOVE_ACTIONS.includes(id),
          handler: () => {
            reportResponse('result:insert');
            pageResponseHandler(id, host, ctx, 'before').catch(console.error);
            panel.hide();
          },
        },
        asCaption(host, id),
        {
          name: 'Replace selection',
          icon: ReplaceIcon,
          showWhen: () =>
            !!panel.answer && !EXCLUDING_REPLACE_ACTIONS.includes(id),
          handler: () => {
            reportResponse('result:replace');
            replaceWithMarkdown(host).catch(console.error);
            panel.hide();
          },
        },
        createNewNote(host),
      ],
    },
    {
      name: '',
      items: [
        {
          name: 'Continue in chat',
          icon: ChatWithAIIcon,
          handler: () => {
            reportResponse('result:continue-in-chat');
            AIProvider.slots.requestOpenWithChat.emit({ host });
            panel.hide();
          },
        },
        {
          name: 'Regenerate',
          icon: RetryIcon,
          handler: () => {
            reportResponse('result:retry');
            panel.generate();
          },
        },
        {
          name: 'Discard',
          icon: DiscardIcon,
          handler: () => {
            panel.discard();
          },
        },
      ],
    },
  ];
}

export function buildErrorResponseConfig(panel: AffineAIPanelWidget) {
  return [
    {
      name: '',
      items: [
        {
          name: 'Retry',
          icon: RetryIcon,
          showWhen: () => true,
          handler: () => {
            reportResponse('result:retry');
            panel.generate();
          },
        },
        {
          name: 'Discard',
          icon: DiscardIcon,
          showWhen: () => !!panel.answer,
          handler: () => {
            panel.discard();
          },
        },
      ],
    },
  ];
}

export function buildFinishConfig<T extends keyof BlockSuitePresets.AIActions>(
  panel: AffineAIPanelWidget,
  id: T,
  ctx: AIContext
) {
  return {
    responses: buildPageResponseConfig(panel, id, ctx),
    actions: [],
  };
}

export function buildErrorConfig(panel: AffineAIPanelWidget) {
  return {
    upgrade: () => {
      AIProvider.slots.requestUpgradePlan.emit({ host: panel.host });
      panel.hide();
    },
    login: () => {
      AIProvider.slots.requestLogin.emit({ host: panel.host });
      panel.hide();
    },
    cancel: () => {
      panel.hide();
    },
    responses: buildErrorResponseConfig(panel),
  };
}

export function buildGeneratingConfig(generatingIcon?: TemplateResult<1>) {
  return {
    generatingIcon: generatingIcon ?? AIStarIconWithAnimation,
  };
}

export function buildCopyConfig(panel: AffineAIPanelWidget) {
  return {
    allowed: true,
    onCopy: () => {
      return copyTextAnswer(panel);
    },
  };
}

export function buildAIPanelConfig(
  panel: AffineAIPanelWidget,
  framework: FrameworkProvider
): AffineAIPanelWidgetConfig {
  const ctx = new AIContext();
  const searchService = framework.get(AINetworkSearchService);
  return {
    answerRenderer: createTextRenderer(panel.host, { maxHeight: 320 }),
    finishStateConfig: buildFinishConfig(panel, 'chat', ctx),
    generatingStateConfig: buildGeneratingConfig(),
    errorStateConfig: buildErrorConfig(panel),
    copy: buildCopyConfig(panel),
    networkSearchConfig: {
      visible: searchService.visible,
      enabled: searchService.enabled,
      setEnabled: searchService.setEnabled,
    },
  };
}
