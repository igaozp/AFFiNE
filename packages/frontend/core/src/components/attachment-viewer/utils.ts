import type { PageSize } from '@affine/core/modules/pdf/renderer/types';
import type { AttachmentBlockModel } from '@blocksuite/affine/blocks';
import { filesize } from 'filesize';

import { downloadBlob } from '../../utils/resource';
import type { PDFViewerProps } from './types';

export async function getAttachmentBlob(model: AttachmentBlockModel) {
  const sourceId = model.sourceId;
  if (!sourceId) {
    return null;
  }

  const doc = model.doc;
  let blob = await doc.blobSync.get(sourceId);

  if (blob) {
    blob = new Blob([blob], { type: model.type });
  }

  return blob;
}

export async function download(model: AttachmentBlockModel) {
  const blob = await getAttachmentBlob(model);
  if (!blob) return;

  await downloadBlob(blob, model.name);
}

export function buildAttachmentProps(
  model: AttachmentBlockModel
): PDFViewerProps {
  const pieces = model.name.split('.');
  const ext = pieces.pop() || '';
  const name = pieces.join('.');
  const size = filesize(model.size);
  return { model, name, ext, size };
}

export function calculatePageNum(el: HTMLElement, pageCount: number) {
  const { scrollTop, scrollHeight } = el;
  const pageHeight = scrollHeight / pageCount;
  const n = scrollTop / pageHeight;
  const t = n / pageCount;
  const index = Math.floor(n + t);
  const cursor = Math.min(index, pageCount - 1);
  return cursor;
}

export function fitToPage(
  viewportInfo: PageSize,
  actualSize: PageSize,
  maxSize: PageSize,
  isThumbnail?: boolean
) {
  const { width: vw, height: vh } = viewportInfo;
  const { width: w, height: h } = actualSize;
  const { width: mw, height: mh } = maxSize;
  let width = 0;
  let height = 0;
  if (h / w > vh / vw) {
    height = vh * (h / mh);
    width = (w / h) * height;
  } else {
    const t = isThumbnail ? Math.min(w / h, 1) : w / mw;
    width = vw * t;
    height = (h / w) * width;
  }
  return {
    width: Math.ceil(width),
    height: Math.ceil(height),
    aspectRatio: width / height,
  };
}
