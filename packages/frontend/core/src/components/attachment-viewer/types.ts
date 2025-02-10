import type { AttachmentBlockModel } from '@blocksuite/affine/blocks';

export type AttachmentViewerProps = {
  model: AttachmentBlockModel;
};

export type PDFViewerProps = {
  model: AttachmentBlockModel;
  name: string;
  ext: string;
  size: string;
};
