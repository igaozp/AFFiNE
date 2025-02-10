import type { BlockStdScope } from '@blocksuite/block-std';
import type { TransformerMiddleware } from '@blocksuite/store';

export const surfaceRefToEmbed =
  (std: BlockStdScope): TransformerMiddleware =>
  ({ slots }) => {
    let pageId: string | null = null;
    slots.beforeImport.on(payload => {
      if (payload.type === 'slice') {
        pageId = payload.snapshot.pageId;
      }
    });
    slots.beforeImport.on(payload => {
      if (
        pageId &&
        payload.type === 'block' &&
        payload.snapshot.flavour === 'affine:surface-ref' &&
        !std.store.hasBlock(payload.snapshot.id)
      ) {
        const id = payload.snapshot.id;
        payload.snapshot.id = std.workspace.idGenerator();
        payload.snapshot.flavour = 'affine:embed-linked-doc';
        payload.snapshot.props = {
          blockId: id,
          pageId,
        };
      }
    });
  };
