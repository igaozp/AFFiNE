import type { GfxBlockElementModel } from '@blocksuite/block-std/gfx';
import { deserializeXYWH } from '@blocksuite/global/utils';

export function xywhArrayToObject(element: GfxBlockElementModel) {
  const [x, y, w, h] = deserializeXYWH(element.xywh);
  return { x, y, w, h };
}
