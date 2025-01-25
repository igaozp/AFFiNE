import { BlockService } from '@blocksuite/affine/block-std';
import { RootBlockSchema } from '@blocksuite/affine/blocks';
import { Slot } from '@blocksuite/affine/global/utils';

export class MindmapService extends BlockService {
  static override readonly flavour = RootBlockSchema.model.flavour;

  requestCenter = new Slot();

  center() {
    this.requestCenter.emit();
  }

  override mounted(): void {}
}
