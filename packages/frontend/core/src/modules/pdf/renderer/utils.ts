import type { AttachmentBlockModel } from '@blocksuite/affine/blocks';

export async function downloadBlobToBuffer(model: AttachmentBlockModel) {
  const sourceId = model.sourceId;
  if (!sourceId) {
    throw new Error('Attachment not found');
  }

  const blob = await model.doc.blobSync.get(sourceId);
  if (!blob) {
    throw new Error('Attachment not found');
  }

  return await blob.arrayBuffer();
}
