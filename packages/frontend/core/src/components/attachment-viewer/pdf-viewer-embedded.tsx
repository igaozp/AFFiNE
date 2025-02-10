import { AttachmentPreviewErrorBoundary } from './error';
import { PDFViewerEmbeddedInner } from './pdf-viewer-embedded-inner';
import type { AttachmentViewerProps } from './types';
import { buildAttachmentProps } from './utils';

// In Embed view
export const AttachmentEmbedPreview = ({ model }: AttachmentViewerProps) => {
  return (
    <AttachmentPreviewErrorBoundary key={model.id}>
      <PDFViewerEmbeddedInner {...buildAttachmentProps(model)} />
    </AttachmentPreviewErrorBoundary>
  );
};
