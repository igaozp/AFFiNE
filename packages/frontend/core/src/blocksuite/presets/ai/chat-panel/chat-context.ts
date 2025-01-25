import type { AIError } from '@blocksuite/affine/blocks';
import type { Signal } from '@preact/signals-core';

export type ChatMessage = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  attachments?: string[];
  createdAt: string;
};

export type ChatAction = {
  action: string;
  messages: ChatMessage[];
  sessionId: string;
  createdAt: string;
};

export type ChatItem = ChatMessage | ChatAction;

export type ChatStatus =
  | 'loading'
  | 'success'
  | 'error'
  | 'idle'
  | 'transmitting';

export interface DocContext {
  docId: string;
  plaintext?: string;
  markdown?: string;
  images?: File[];
}

export type ChatContextValue = {
  // history messages of the chat
  items: ChatItem[];
  status: ChatStatus;
  error: AIError | null;
  // plain-text of the selected content
  quote: string;
  // markdown of the selected content
  markdown: string;
  // images of the selected content or user uploaded
  images: File[];
  // chips of workspace doc or user uploaded file
  chips: ChatChip[];
  abortController: AbortController | null;
  chatSessionId: string | null;
};

export type ChatBlockMessage = ChatMessage & {
  userId?: string;
  userName?: string;
  avatarUrl?: string;
};

export type ChipState =
  | 'candidate'
  | 'uploading'
  | 'embedding'
  | 'success'
  | 'failed';

export interface BaseChip {
  /**
   * candidate: the chip is a candidate for the chat
   * uploading: the chip is uploading
   * embedding: the chip is embedding
   * success: the chip is successfully embedded
   * failed: the chip is failed to embed
   */
  state: ChipState;
  tooltip?: string;
}

export interface DocChip extends BaseChip {
  docId: string;
  markdown?: Signal<string>;
}

export interface FileChip extends BaseChip {
  fileName: string;
  fileId: string;
  fileType: string;
}

export type ChatChip = DocChip | FileChip;
