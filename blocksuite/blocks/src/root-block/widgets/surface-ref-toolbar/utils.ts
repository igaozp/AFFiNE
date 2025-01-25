import type { CanvasRenderer } from '@blocksuite/affine-block-surface';
import type { SurfaceRefBlockComponent } from '@blocksuite/affine-block-surface-ref';
import { isTopLevelBlock } from '@blocksuite/affine-shared/utils';
import type { EditorHost } from '@blocksuite/block-std';
import { assertExists, Bound } from '@blocksuite/global/utils';

import { ExportManager } from '../../../_common/export-manager/export-manager.js';

export const edgelessToBlob = async (
  host: EditorHost,
  options: {
    surfaceRefBlock: SurfaceRefBlockComponent;
    surfaceRenderer: CanvasRenderer;
    edgelessElement: BlockSuite.EdgelessModel;
  }
): Promise<Blob> => {
  const { edgelessElement } = options;
  const exportManager = host.std.get(ExportManager);
  const bound = Bound.deserialize(edgelessElement.xywh);
  const isBlock = isTopLevelBlock(edgelessElement);

  return exportManager
    .edgelessToCanvas(
      options.surfaceRenderer,
      bound,
      undefined,
      isBlock ? [edgelessElement] : undefined,
      isBlock ? undefined : [edgelessElement],
      { zoom: options.surfaceRenderer.viewport.zoom }
    )
    .then(canvas => {
      assertExists(canvas);
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          blob => (blob ? resolve(blob) : reject(null)),
          'image/png'
        );
      });
    });
};

export const writeImageBlobToClipboard = async (blob: Blob) => {
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
};
