import type { EditorHost } from '@blocksuite/affine/block-std';
import { LayerManager } from '@blocksuite/affine/block-std/gfx';
import {
  getSurfaceBlock,
  TemplateJob,
  TemplateMiddlewares,
} from '@blocksuite/affine/blocks';
import {
  assertExists,
  Bound,
  getCommonBound,
} from '@blocksuite/affine/global/utils';

export function createTemplateJob(host: EditorHost) {
  const surface = getSurfaceBlock(host.doc);
  assertExists(surface);

  const middlewares: ((job: TemplateJob) => void)[] = [];
  const layer = new LayerManager(host.doc, surface, {
    watch: false,
  });
  const bounds = [...layer.blocks, ...layer.canvasElements].map(i =>
    Bound.deserialize(i.xywh)
  );
  const currentContentBound = getCommonBound(bounds);

  if (currentContentBound) {
    currentContentBound.x += currentContentBound.w + 100;
    middlewares.push(
      TemplateMiddlewares.createInsertPlaceMiddleware(currentContentBound)
    );
  }

  const idxGenerator = layer.createIndexGenerator();
  middlewares.push(
    TemplateMiddlewares.createRegenerateIndexMiddleware(() => idxGenerator())
  );
  middlewares.push(TemplateMiddlewares.replaceIdMiddleware);

  return TemplateJob.create({
    model: surface,
    type: 'template',
    middlewares,
  });
}
