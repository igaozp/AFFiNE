import { type PDF, PDFService, PDFStatus } from '@affine/core/modules/pdf';
import { LoadingSvg } from '@affine/core/modules/pdf/views';
import track from '@affine/track';
import { useLiveData, useService } from '@toeverything/infra';
import { useEffect, useState } from 'react';

import { PDFViewerInner } from './pdf-viewer-inner';
import type { PDFViewerProps } from './types';

function PDFViewerStatus({ pdf, ...props }: PDFViewerProps & { pdf: PDF }) {
  const state = useLiveData(pdf.state$);

  useEffect(() => {
    if (state.status !== PDFStatus.Error) return;

    track.$.attachment.$.openPDFRendererFail();
  }, [state]);

  if (state?.status !== PDFStatus.Opened) {
    return <PDFLoading />;
  }

  return <PDFViewerInner {...props} pdf={pdf} state={state} />;
}

export function PDFViewer({ model, ...props }: PDFViewerProps) {
  const pdfService = useService(PDFService);
  const [pdf, setPdf] = useState<PDF | null>(null);

  useEffect(() => {
    const { pdf, release } = pdfService.get(model);
    setPdf(pdf);

    return () => {
      release();
    };
  }, [model, pdfService, setPdf]);

  if (!pdf) {
    return <PDFLoading />;
  }

  return <PDFViewerStatus {...props} model={model} pdf={pdf} />;
}

const PDFLoading = () => (
  <div style={{ margin: 'auto' }}>
    <LoadingSvg />
  </div>
);
