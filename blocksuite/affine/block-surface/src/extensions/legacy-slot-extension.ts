import type { FrameBlockModel } from '@blocksuite/affine-model';
import { createIdentifier } from '@blocksuite/global/di';
import { Slot } from '@blocksuite/global/utils';
import type { ExtensionType } from '@blocksuite/store';

export const EdgelessLegacySlotIdentifier = createIdentifier<{
  readonlyUpdated: Slot<boolean>;
  navigatorSettingUpdated: Slot<{
    hideToolbar?: boolean;
    blackBackground?: boolean;
    fillScreen?: boolean;
  }>;
  navigatorFrameChanged: Slot<FrameBlockModel>;
  fullScreenToggled: Slot;

  elementResizeStart: Slot;
  elementResizeEnd: Slot;
  toggleNoteSlicer: Slot;

  toolbarLocked: Slot<boolean>;
}>('AffineEdgelessLegacySlotService');

export const EdgelessLegacySlotExtension: ExtensionType = {
  setup: di => {
    di.addImpl(EdgelessLegacySlotIdentifier, () => ({
      readonlyUpdated: new Slot<boolean>(),
      navigatorSettingUpdated: new Slot<{
        hideToolbar?: boolean;
        blackBackground?: boolean;
        fillScreen?: boolean;
      }>(),
      navigatorFrameChanged: new Slot<FrameBlockModel>(),
      fullScreenToggled: new Slot(),
      elementResizeStart: new Slot(),
      elementResizeEnd: new Slot(),
      toggleNoteSlicer: new Slot(),
      toolbarLocked: new Slot<boolean>(),
    }));
  },
};
