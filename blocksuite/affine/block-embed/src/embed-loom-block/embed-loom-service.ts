import {
  EmbedLoomBlockSchema,
  type EmbedLoomModel,
  EmbedLoomStyles,
} from '@blocksuite/affine-model';
import { EmbedOptionProvider } from '@blocksuite/affine-shared/services';
import { BlockService } from '@blocksuite/block-std';

import { loomUrlRegex } from './embed-loom-model.js';
import { queryEmbedLoomData } from './utils.js';

export class EmbedLoomBlockService extends BlockService {
  static override readonly flavour = EmbedLoomBlockSchema.model.flavour;

  queryUrlData = (embedLoomModel: EmbedLoomModel, signal?: AbortSignal) => {
    return queryEmbedLoomData(embedLoomModel, signal);
  };

  override mounted() {
    super.mounted();

    this.std.get(EmbedOptionProvider).registerEmbedBlockOptions({
      flavour: this.flavour,
      urlRegex: loomUrlRegex,
      styles: EmbedLoomStyles,
      viewType: 'embed',
    });
  }
}
