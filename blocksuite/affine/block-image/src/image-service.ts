import { FileDropConfigExtension } from '@blocksuite/affine-components/drag-indicator';
import { ImageBlockSchema, MAX_IMAGE_WIDTH } from '@blocksuite/affine-model';
import { TelemetryProvider } from '@blocksuite/affine-shared/services';
import {
  isInsideEdgelessEditor,
  matchFlavours,
} from '@blocksuite/affine-shared/utils';
import { BlockService } from '@blocksuite/block-std';
import { GfxControllerIdentifier } from '@blocksuite/block-std/gfx';

import { setImageProxyMiddlewareURL } from './adapters/middleware.js';
import { addImages, addSiblingImageBlock } from './utils.js';

// bytes.parse('2GB')
const maxFileSize = 2147483648;

export class ImageBlockService extends BlockService {
  static override readonly flavour = ImageBlockSchema.model.flavour;

  static setImageProxyURL = setImageProxyMiddlewareURL;

  maxFileSize = maxFileSize;
}

export const ImageDropOption = FileDropConfigExtension({
  flavour: ImageBlockSchema.model.flavour,
  onDrop: ({ files, targetModel, placement, point, std }) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (!imageFiles.length) return false;

    if (targetModel && !matchFlavours(targetModel, ['affine:surface'])) {
      addSiblingImageBlock(
        std.host,
        imageFiles,
        // TODO: use max file size from service
        maxFileSize,
        targetModel,
        placement
      );
      return true;
    }

    if (isInsideEdgelessEditor(std.host)) {
      const gfx = std.get(GfxControllerIdentifier);
      point = gfx.viewport.toViewCoordFromClientCoord(point);
      addImages(std, files, { point, maxWidth: MAX_IMAGE_WIDTH }).catch(
        console.error
      );

      std.getOptional(TelemetryProvider)?.track('CanvasElementAdded', {
        control: 'canvas:drop',
        page: 'whiteboard editor',
        module: 'toolbar',
        segment: 'toolbar',
        type: 'image',
      });
      return true;
    }

    return false;
  },
});
