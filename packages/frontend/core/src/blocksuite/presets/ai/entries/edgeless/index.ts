import type {
  AIItemGroupConfig,
  DocMode,
  EdgelessCopilotWidget,
  EdgelessElementToolbarWidget,
  EdgelessRootBlockComponent,
} from '@blocksuite/affine/blocks';
import { EdgelessCopilotToolbarEntry } from '@blocksuite/affine/blocks';
import { noop } from '@blocksuite/affine/global/utils';
import { html } from 'lit';

import { AIProvider } from '../../provider';
import { getAIPanelWidget } from '../../utils/ai-widgets';
import { getEdgelessCopilotWidget } from '../../utils/edgeless';
import { extractSelectedContent } from '../../utils/extract';
import { edgelessAIGroups } from './actions-config';

noop(EdgelessCopilotToolbarEntry);

export function setupEdgelessCopilot(widget: EdgelessCopilotWidget) {
  widget.groups = edgelessAIGroups;
}

export function setupEdgelessElementToolbarAIEntry(
  widget: EdgelessElementToolbarWidget
) {
  widget.registerEntry({
    when: () => {
      return true;
    },
    render: (edgeless: EdgelessRootBlockComponent) => {
      const chain = edgeless.service.std.command.chain();
      const filteredGroups = edgelessAIGroups.reduce((pre, group) => {
        const filtered = group.items.filter(item =>
          item.showWhen?.(chain, 'edgeless' as DocMode, edgeless.host)
        );

        if (filtered.length > 0) pre.push({ ...group, items: filtered });

        return pre;
      }, [] as AIItemGroupConfig[]);

      if (filteredGroups.every(group => group.items.length === 0)) return null;

      const handler = () => {
        const aiPanel = getAIPanelWidget(edgeless.host);
        if (aiPanel.config) {
          aiPanel.config.generateAnswer = ({ finish, input }) => {
            finish('success');
            aiPanel.discard();
            extractSelectedContent(edgeless.host)
              .then(context => {
                AIProvider.slots.requestSendWithChat.emit({
                  input,
                  context,
                  host: edgeless.host,
                });
              })
              .catch(console.error);
          };
          aiPanel.config.inputCallback = text => {
            const copilotWidget = getEdgelessCopilotWidget(edgeless.host);
            const panel = copilotWidget.shadowRoot?.querySelector(
              'edgeless-copilot-panel'
            );
            if (panel instanceof HTMLElement) {
              panel.style.visibility = text ? 'hidden' : 'visible';
            }
          };
        }
      };

      return html`<edgeless-copilot-toolbar-entry
        .edgeless=${edgeless}
        .host=${edgeless.host}
        .groups=${edgelessAIGroups}
        .onClick=${handler}
      ></edgeless-copilot-toolbar-entry>`;
    },
  });
}
