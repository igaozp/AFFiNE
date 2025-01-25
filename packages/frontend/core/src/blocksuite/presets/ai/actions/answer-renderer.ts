import type { EditorHost } from '@blocksuite/affine/block-std';
import type {
  AffineAIPanelWidget,
  MindmapElementModel,
} from '@blocksuite/affine/blocks';

import { createTextRenderer } from '../../_common';
import {
  createMindmapExecuteRenderer,
  createMindmapRenderer,
} from '../messages/mindmap';
import { createSlidesRenderer } from '../messages/slides-renderer';
import { createIframeRenderer, createImageRenderer } from '../messages/wrapper';
import type { AIContext } from '../utils/context';
import { isMindmapChild, isMindMapRoot } from '../utils/edgeless';
import { IMAGE_ACTIONS } from './consts';
import { responseToExpandMindmap } from './edgeless-response';

type AnswerRenderer = NonNullable<
  AffineAIPanelWidget['config']
>['answerRenderer'];

export function actionToAnswerRenderer<
  T extends keyof BlockSuitePresets.AIActions,
>(id: T, host: EditorHost, ctx: AIContext): AnswerRenderer {
  if (id === 'brainstormMindmap') {
    const selectedElements = ctx.get().selectedElements;
    if (
      selectedElements &&
      (isMindMapRoot(selectedElements[0]) ||
        isMindmapChild(selectedElements[0]))
    ) {
      const mindmap = selectedElements[0].group as MindmapElementModel;

      return createMindmapRenderer(host, ctx, mindmap.style);
    }

    return createMindmapRenderer(host, ctx);
  }

  if (id === 'expandMindmap') {
    return createMindmapExecuteRenderer(host, ctx, responseToExpandMindmap);
  }

  if (id === 'createSlides') {
    return createSlidesRenderer(host, ctx);
  }

  if (id === 'makeItReal') {
    return createIframeRenderer(host, { height: 300 });
  }

  if (IMAGE_ACTIONS.includes(id)) {
    return createImageRenderer(host, { height: 300 });
  }

  return createTextRenderer(host, { maxHeight: 320 });
}
