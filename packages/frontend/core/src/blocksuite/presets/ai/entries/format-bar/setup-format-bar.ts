import '../../_common/components/ask-ai-button';

import {
  type AffineFormatBarWidget,
  toolbarDefaultConfig,
} from '@blocksuite/affine/blocks';
import { html, type TemplateResult } from 'lit';

import { pageAIGroups } from '../../_common/config';

export function setupFormatBarAIEntry(formatBar: AffineFormatBarWidget) {
  toolbarDefaultConfig(formatBar);
  formatBar.addRawConfigItems(
    [
      {
        type: 'custom' as const,
        render(formatBar: AffineFormatBarWidget): TemplateResult | null {
          const richText = getRichText();
          if (richText?.dataset.disableAskAi !== undefined) return null;
          return html`
            <ask-ai-toolbar-button
              .host=${formatBar.host}
              .actionGroups=${pageAIGroups}
            ></ask-ai-toolbar-button>
          `;
        },
      },
      { type: 'divider' },
    ],
    0
  );
}
const getRichText = () => {
  const selection = getSelection();
  if (!selection) return null;
  if (selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const commonAncestorContainer =
    range.commonAncestorContainer instanceof Element
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
  if (!commonAncestorContainer) return null;
  return commonAncestorContainer.closest('rich-text');
};
