import './chat-panel-input';
import './chat-panel-messages';

import type { EditorHost } from '@blocksuite/affine/block-std';
import { ShadowlessElement } from '@blocksuite/affine/block-std';
import { NotificationProvider } from '@blocksuite/affine/blocks';
import { debounce, WithDisposable } from '@blocksuite/affine/global/utils';
import type { Store } from '@blocksuite/affine/store';
import { css, html, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { createRef, type Ref, ref } from 'lit/directives/ref.js';
import { throttle } from 'lodash-es';

import { AIHelpIcon, SmallHintIcon } from '../_common/icons';
import { AIProvider } from '../provider';
import { extractSelectedContent } from '../utils/extract';
import {
  getSelectedImagesAsBlobs,
  getSelectedTextContent,
} from '../utils/selection-utils';
import type {
  AINetworkSearchConfig,
  DocDisplayConfig,
  DocSearchMenuConfig,
} from './chat-config';
import type {
  ChatAction,
  ChatContextValue,
  ChatItem,
  DocChip,
} from './chat-context';
import type { ChatPanelMessages } from './chat-panel-messages';

export class ChatPanel extends WithDisposable(ShadowlessElement) {
  static override styles = css`
    chat-panel {
      width: 100%;
    }

    .chat-panel-container {
      display: flex;
      flex-direction: column;
      padding: 0 16px;
      padding-top: 8px;
      height: 100%;
    }

    .chat-panel-title {
      background: var(--affine-background-primary-color);
      position: relative;
      padding: 8px 0px;
      width: 100%;
      height: 36px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 1;

      div:first-child {
        font-size: 14px;
        font-weight: 500;
        color: var(--affine-text-secondary-color);
      }

      div:last-child {
        width: 24px;
        height: 24px;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
      }
    }

    chat-panel-messages {
      flex: 1;
      overflow-y: hidden;
    }

    .chat-panel-hints {
      margin: 0 4px;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--affine-border-color);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }

    .chat-panel-hints :first-child {
      color: var(--affine-text-primary-color);
    }

    .chat-panel-hints :nth-child(2) {
      color: var(--affine-text-secondary-color);
    }

    .chat-panel-footer {
      margin: 8px 0px;
      height: 20px;
      display: flex;
      gap: 4px;
      align-items: center;
      color: var(--affine-text-secondary-color);
      font-size: 12px;
      user-select: none;
    }
  `;

  private readonly _chatMessages: Ref<ChatPanelMessages> =
    createRef<ChatPanelMessages>();

  private _resettingCounter = 0;

  private readonly _resetItems = debounce(() => {
    const counter = ++this._resettingCounter;
    this.isLoading = true;
    (async () => {
      const { doc } = this;

      const [histories, actions] = await Promise.all([
        AIProvider.histories?.chats(doc.workspace.id, doc.id, { fork: false }),
        AIProvider.histories?.actions(doc.workspace.id, doc.id),
      ]);

      if (counter !== this._resettingCounter) return;

      const items: ChatItem[] = actions ? [...actions] : [];

      if (histories?.at(-1)) {
        const history = histories.at(-1);
        if (!history) return;
        this.chatContextValue.chatSessionId = history.sessionId;
        items.push(...history.messages);
        AIProvider.LAST_ROOT_SESSION_ID = history.sessionId;
      }

      const { chips } = this.chatContextValue;
      const defaultChip: DocChip = {
        docId: this.doc.id,
        state: 'candidate',
      };
      const nextChips =
        items.length === 0 && chips.length === 0 ? [defaultChip] : chips;
      this.chatContextValue = {
        ...this.chatContextValue,
        items: items.sort((a, b) => {
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        }),
        chips: nextChips,
      };

      this.isLoading = false;
      this._scrollToEnd();
    })().catch(console.error);
  }, 200);

  @property({ attribute: false })
  accessor host!: EditorHost;

  @property({ attribute: false })
  accessor doc!: Store;

  @property({ attribute: false })
  accessor networkSearchConfig!: AINetworkSearchConfig;

  @property({ attribute: false })
  accessor docSearchMenuConfig!: DocSearchMenuConfig;

  @property({ attribute: false })
  accessor docDisplayConfig!: DocDisplayConfig;

  @state()
  accessor isLoading = false;

  @state()
  accessor chatContextValue: ChatContextValue = {
    quote: '',
    images: [],
    abortController: null,
    items: [],
    chips: [],
    status: 'idle',
    error: null,
    markdown: '',
    chatSessionId: null,
  };

  private readonly _scrollToEnd = () => {
    this._chatMessages.value?.scrollToEnd();
  };

  private readonly _throttledScrollToEnd = throttle(this._scrollToEnd, 1000);

  private readonly _cleanupHistories = async () => {
    const notification = this.host.std.getOptional(NotificationProvider);
    if (!notification) return;

    if (
      await notification.confirm({
        title: 'Clear History',
        message:
          'Are you sure you want to clear all history? This action will permanently delete all content, including all chat logs and data, and cannot be undone.',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
      })
    ) {
      await AIProvider.histories?.cleanup(this.doc.workspace.id, this.doc.id, [
        this.chatContextValue.chatSessionId ?? '',
        ...(
          this.chatContextValue.items.filter(
            item => 'sessionId' in item
          ) as ChatAction[]
        ).map(item => item.sessionId),
      ]);
      this.chatContextValue.chatSessionId = null;
      notification.toast('History cleared');
      this._resetItems();
    }
  };

  protected override updated(_changedProperties: PropertyValues) {
    if (_changedProperties.has('doc')) {
      requestAnimationFrame(() => {
        this.chatContextValue.chatSessionId = null;
        // TODO get from CopilotContext
        this.chatContextValue.chips = [];
        this._resetItems();
      });
    }

    if (
      _changedProperties.has('chatContextValue') &&
      (this.chatContextValue.status === 'loading' ||
        this.chatContextValue.status === 'error' ||
        this.chatContextValue.status === 'success')
    ) {
      setTimeout(this._scrollToEnd, 500);
    }

    if (
      _changedProperties.has('chatContextValue') &&
      this.chatContextValue.status === 'transmitting'
    ) {
      this._throttledScrollToEnd();
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    if (!this.doc) throw new Error('doc is required');

    this._disposables.add(
      AIProvider.slots.actions.on(({ action, event }) => {
        const { status } = this.chatContextValue;
        if (
          action !== 'chat' &&
          event === 'finished' &&
          (status === 'idle' || status === 'success')
        ) {
          this._resetItems();
        }
      })
    );
    this._disposables.add(
      AIProvider.slots.userInfo.on(userInfo => {
        if (userInfo) {
          this._resetItems();
        }
      })
    );
    this._disposables.add(
      AIProvider.slots.requestOpenWithChat.on(async ({ host }) => {
        if (this.host === host) {
          const context = await extractSelectedContent(host);
          if (!context) return;
          this.updateContext(context);
        }
      })
    );
  }

  updateContext = (context: Partial<ChatContextValue>) => {
    this.chatContextValue = { ...this.chatContextValue, ...context };
  };

  continueInChat = async () => {
    const text = await getSelectedTextContent(this.host, 'plain-text');
    const markdown = await getSelectedTextContent(this.host, 'markdown');
    const images = await getSelectedImagesAsBlobs(this.host);
    this.updateContext({
      quote: text,
      markdown,
      images,
    });
  };

  override render() {
    return html` <div class="chat-panel-container">
      <div class="chat-panel-title">
        <div>AFFiNE AI</div>
        <div
          @click=${() => {
            AIProvider.toggleGeneralAIOnboarding?.(true);
          }}
        >
          ${AIHelpIcon}
        </div>
      </div>
      <chat-panel-messages
        ${ref(this._chatMessages)}
        .chatContextValue=${this.chatContextValue}
        .updateContext=${this.updateContext}
        .host=${this.host}
        .isLoading=${this.isLoading}
      ></chat-panel-messages>
      <chat-panel-chips
        .host=${this.host}
        .chatContextValue=${this.chatContextValue}
        .updateContext=${this.updateContext}
        .docDisplayConfig=${this.docDisplayConfig}
        .docSearchMenuConfig=${this.docSearchMenuConfig}
      ></chat-panel-chips>
      <chat-panel-input
        .chatContextValue=${this.chatContextValue}
        .networkSearchConfig=${this.networkSearchConfig}
        .updateContext=${this.updateContext}
        .host=${this.host}
        .cleanupHistories=${this._cleanupHistories}
      ></chat-panel-input>
      <div class="chat-panel-footer">
        ${SmallHintIcon}
        <div>AI outputs can be misleading or wrong</div>
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-panel': ChatPanel;
  }
}
