import { FileDropConfigExtension } from '@blocksuite/affine-components/drag-indicator';
import { AttachmentBlockSchema } from '@blocksuite/affine-model';
import { TelemetryProvider } from '@blocksuite/affine-shared/services';
import {
  isInsideEdgelessEditor,
  matchFlavours,
} from '@blocksuite/affine-shared/utils';
import { BlockService } from '@blocksuite/block-std';
import { GfxControllerIdentifier } from '@blocksuite/block-std/gfx';

import { addAttachments, addSiblingAttachmentBlocks } from './utils.js';

// bytes.parse('2GB')
const maxFileSize = 2147483648;

export class AttachmentBlockService extends BlockService {
  static override readonly flavour = AttachmentBlockSchema.model.flavour;

  maxFileSize = maxFileSize;
}

export const AttachmentDropOption = FileDropConfigExtension({
  flavour: AttachmentBlockSchema.model.flavour,
  onDrop: ({ files, targetModel, placement, point, std }) => {
    // generic attachment block for all files except images
    const attachmentFiles = files.filter(
      file => !file.type.startsWith('image/')
    );
    if (!attachmentFiles.length) return false;

    if (targetModel && !matchFlavours(targetModel, ['affine:surface'])) {
      addSiblingAttachmentBlocks(
        std.host,
        attachmentFiles,
        // TODO: use max file size from service
        maxFileSize,
        targetModel,
        placement
      ).catch(console.error);

      return true;
    }

    if (isInsideEdgelessEditor(std.host)) {
      const gfx = std.get(GfxControllerIdentifier);
      point = gfx.viewport.toViewCoordFromClientCoord(point);
      addAttachments(std, attachmentFiles, point).catch(console.error);

      std.getOptional(TelemetryProvider)?.track('CanvasElementAdded', {
        control: 'canvas:drop',
        page: 'whiteboard editor',
        module: 'toolbar',
        segment: 'toolbar',
        type: 'attachment',
      });

      return true;
    }

    return false;
  },
});
