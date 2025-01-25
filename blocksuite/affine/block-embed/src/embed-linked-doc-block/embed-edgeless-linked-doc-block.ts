import { EdgelessCRUDIdentifier } from '@blocksuite/affine-block-surface';
import {
  EMBED_CARD_HEIGHT,
  EMBED_CARD_WIDTH,
} from '@blocksuite/affine-shared/consts';
import { FeatureFlagService } from '@blocksuite/affine-shared/services';
import {
  cloneReferenceInfoWithoutAliases,
  isNewTabTrigger,
  isNewViewTrigger,
} from '@blocksuite/affine-shared/utils';
import { Bound } from '@blocksuite/global/utils';

import { toEdgelessEmbedBlock } from '../common/to-edgeless-embed-block.js';
import { EmbedLinkedDocBlockComponent } from './embed-linked-doc-block.js';

export class EmbedEdgelessLinkedDocBlockComponent extends toEdgelessEmbedBlock(
  EmbedLinkedDocBlockComponent
) {
  override convertToEmbed = () => {
    const { id, doc, caption, xywh } = this.model;

    // synced doc entry controlled by flag
    const isSyncedDocEnabled = doc
      .get(FeatureFlagService)
      .getFlag('enable_synced_doc_block');
    if (!isSyncedDocEnabled) {
      return;
    }

    const style = 'syncedDoc';
    const bound = Bound.deserialize(xywh);
    bound.w = EMBED_CARD_WIDTH[style];
    bound.h = EMBED_CARD_HEIGHT[style];

    const edgelessService = this.rootService;

    if (!edgelessService) {
      return;
    }

    const { addBlock } = this.std.get(EdgelessCRUDIdentifier);
    const surface = this.gfx.surface ?? undefined;
    const newId = addBlock(
      'affine:embed-synced-doc',
      {
        xywh: bound.serialize(),
        caption,
        ...cloneReferenceInfoWithoutAliases(this.referenceInfo$.peek()),
      },
      surface
    );

    this.std.command.exec('reassociateConnectors', {
      oldId: id,
      newId,
    });

    this.gfx.selection.set({
      editing: false,
      elements: [newId],
    });

    doc.deleteBlock(this.model);
  };

  get rootService() {
    return this.std.getService('affine:page');
  }

  protected override _handleClick(evt: MouseEvent): void {
    if (isNewTabTrigger(evt)) {
      this.open({ openMode: 'open-in-new-tab', event: evt });
    } else if (isNewViewTrigger(evt)) {
      this.open({ openMode: 'open-in-new-view', event: evt });
    }
  }
}
