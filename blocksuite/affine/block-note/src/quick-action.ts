import {
  convertSelectedBlocksToLinkedDoc,
  getTitleFromSelectedModels,
  notifyDocCreated,
  promptDocTitle,
} from '@blocksuite/affine-block-embed';
import type { BlockStdScope } from '@blocksuite/block-std';

export interface QuickActionConfig {
  id: string;
  hotkey?: string;
  showWhen: (std: BlockStdScope) => boolean;
  action: (std: BlockStdScope) => void;
}

export const quickActionConfig: QuickActionConfig[] = [
  {
    id: 'convert-to-linked-doc',
    hotkey: `Mod-Shift-l`,
    showWhen: std => {
      const [_, ctx] = std.command
        .chain()
        .getSelectedModels({
          types: ['block'],
        })
        .run();
      const { selectedModels } = ctx;
      return !!selectedModels && selectedModels.length > 0;
    },
    action: std => {
      const [_, ctx] = std.command
        .chain()
        .getSelectedModels({
          types: ['block'],
          mode: 'flat',
        })
        .draftSelectedModels()
        .run();
      const { selectedModels, draftedModels } = ctx;
      if (!selectedModels) return;

      if (!selectedModels.length || !draftedModels) return;

      std.selection.clear();

      const doc = std.store;
      const autofill = getTitleFromSelectedModels(selectedModels);
      promptDocTitle(std, autofill)
        .then(title => {
          if (title === null) return;
          convertSelectedBlocksToLinkedDoc(
            std,
            doc,
            draftedModels,
            title
          ).catch(console.error);
          notifyDocCreated(std, doc);
        })
        .catch(console.error);
    },
  },
];
