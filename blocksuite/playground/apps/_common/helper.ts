import { AffineSchemas, SpecProvider } from '@blocksuite/blocks';
import { Schema } from '@blocksuite/store';
import { TestWorkspace } from '@blocksuite/store/test';

export function createEmptyDoc() {
  const schema = new Schema().register(AffineSchemas);
  const collection = new TestWorkspace({ schema });
  collection.storeExtensions =
    SpecProvider.getInstance().getSpec('store').value;
  collection.meta.initialize();
  const doc = collection.createDoc();

  return {
    doc,
    init() {
      doc.load();
      const rootId = doc.addBlock('affine:page', {});
      doc.addBlock('affine:surface', {}, rootId);
      const noteId = doc.addBlock('affine:note', {}, rootId);
      doc.addBlock('affine:paragraph', {}, noteId);
      return doc;
    },
  };
}
