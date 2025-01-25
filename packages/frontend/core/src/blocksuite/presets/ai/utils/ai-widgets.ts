import type { EditorHost } from '@blocksuite/affine/block-std';
import {
  AFFINE_AI_PANEL_WIDGET,
  AffineAIPanelWidget,
} from '@blocksuite/affine/blocks';
import { assertExists } from '@blocksuite/affine/global/utils';

export const getAIPanelWidget = (host: EditorHost): AffineAIPanelWidget => {
  const rootBlockId = host.doc.root?.id;
  assertExists(rootBlockId);
  const aiPanel = host.view.getWidget(AFFINE_AI_PANEL_WIDGET, rootBlockId);
  assertExists(aiPanel);
  if (!(aiPanel instanceof AffineAIPanelWidget)) {
    throw new Error('AI panel not found');
  }
  return aiPanel;
};
