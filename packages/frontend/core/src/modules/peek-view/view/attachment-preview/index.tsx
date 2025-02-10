import type { AttachmentBlockModel } from '@blocksuite/affine/blocks';
import { useMemo } from 'react';

import { AttachmentViewer } from '../../../../components/attachment-viewer';
import { useEditor } from '../utils';

export type AttachmentPreviewModalProps = {
  docId: string;
  blockId: string;
};

export const AttachmentPreviewPeekView = ({
  docId,
  blockId,
}: AttachmentPreviewModalProps) => {
  const { doc } = useEditor(docId);
  const blocksuiteDoc = doc?.blockSuiteDoc;
  const model = useMemo(() => {
    const model = blocksuiteDoc?.getBlock(blockId)?.model;
    if (!model) return null;
    return model as AttachmentBlockModel;
  }, [blockId, blocksuiteDoc]);

  return model === null ? null : <AttachmentViewer model={model} />;
};
