import type { ToolbarMoreMenuConfig } from '@blocksuite/affine-components/toolbar';

import type { KeyboardToolbarConfig } from './widgets/keyboard-toolbar/config.js';
import type { LinkedWidgetConfig } from './widgets/linked-doc/index.js';

export interface RootBlockConfig {
  linkedWidget?: Partial<LinkedWidgetConfig>;
  toolbarMoreMenu?: Partial<ToolbarMoreMenuConfig>;
  keyboardToolbar?: Partial<KeyboardToolbarConfig>;
}
