import {
  EmbedYoutubeBlockSchema,
  type EmbedYoutubeModel,
  EmbedYoutubeStyles,
} from '@blocksuite/affine-model';
import {
  EmbedOptionProvider,
  LinkPreviewerService,
} from '@blocksuite/affine-shared/services';
import { BlockService } from '@blocksuite/block-std';

import { youtubeUrlRegex } from './embed-youtube-model.js';
import { queryEmbedYoutubeData } from './utils.js';

export class EmbedYoutubeBlockService extends BlockService {
  static override readonly flavour = EmbedYoutubeBlockSchema.model.flavour;

  queryUrlData = (
    embedYoutubeModel: EmbedYoutubeModel,
    signal?: AbortSignal
  ) => {
    return queryEmbedYoutubeData(
      embedYoutubeModel,
      this.doc.get(LinkPreviewerService),
      signal
    );
  };

  override mounted() {
    super.mounted();

    this.std.get(EmbedOptionProvider).registerEmbedBlockOptions({
      flavour: this.flavour,
      urlRegex: youtubeUrlRegex,
      styles: EmbedYoutubeStyles,
      viewType: 'embed',
    });
  }
}
