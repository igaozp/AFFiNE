import { createIdentifier } from '@blocksuite/global/di';
import { Slot } from '@blocksuite/global/utils';
import type { ExtensionType } from '@blocksuite/store';

import type { RefNodeSlots } from '../inline/index.js';

export const RefNodeSlotsProvider =
  createIdentifier<RefNodeSlots>('AffineRefNodeSlots');

const slots: RefNodeSlots = {
  docLinkClicked: new Slot(),
};

export const RefNodeSlotsExtension: ExtensionType = {
  setup: di => {
    di.addImpl(RefNodeSlotsProvider, () => slots);
  },
};
