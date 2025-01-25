import { ViewBody, ViewHeader } from '@affine/core/modules/workbench';

import { AttachmentPreviewErrorBoundary, Error } from './error';
import { PDFViewer } from './pdf-viewer';
import * as styles from './styles.css';
import { Titlebar } from './titlebar';
import type { AttachmentViewerProps, PDFViewerProps } from './types';
import { buildAttachmentProps } from './utils';

// In Peek view
export const AttachmentViewer = ({ model }: AttachmentViewerProps) => {
  const props = buildAttachmentProps(model);

  return (
    <div className={styles.viewerContainer}>
      <Titlebar {...props} />
      <AttachmentViewerInner {...props} />
    </div>
  );
};

// In View container
export const AttachmentViewerView = ({ model }: AttachmentViewerProps) => {
  const props = buildAttachmentProps(model);

  return (
    <>
      <ViewHeader>
        <Titlebar {...props} />
      </ViewHeader>
      <ViewBody>
        <AttachmentViewerInner {...props} />
      </ViewBody>
    </>
  );
};

const AttachmentViewerInner = (props: PDFViewerProps) => {
  return props.model.type.endsWith('pdf') ? (
    <AttachmentPreviewErrorBoundary>
      <PDFViewer {...props} />
    </AttachmentPreviewErrorBoundary>
  ) : (
    <Error {...props} />
  );
};
