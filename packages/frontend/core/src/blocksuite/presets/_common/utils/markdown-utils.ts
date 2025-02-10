import { WorkspaceImpl } from '@affine/core/modules/workspace/impls/workspace';
import {
  type EditorHost,
  type TextRangePoint,
  TextSelection,
} from '@blocksuite/affine/block-std';
import {
  defaultImageProxyMiddleware,
  embedSyncedDocMiddleware,
  MarkdownAdapter,
  MixTextAdapter,
  pasteMiddleware,
  PlainTextAdapter,
  titleMiddleware,
} from '@blocksuite/affine/blocks';
import type { ServiceProvider } from '@blocksuite/affine/global/di';
import { assertExists } from '@blocksuite/affine/global/utils';
import type {
  BlockModel,
  BlockSnapshot,
  DraftModel,
  Schema,
  Slice,
  SliceSnapshot,
  Store,
  TransformerMiddleware,
} from '@blocksuite/affine/store';
import { Transformer } from '@blocksuite/affine/store';

const updateSnapshotText = (
  point: TextRangePoint,
  snapshot: BlockSnapshot,
  model: DraftModel
) => {
  const { index, length } = point;
  if (!snapshot.props.text || length === 0) {
    return;
  }
  (snapshot.props.text as Record<string, unknown>).delta =
    model.text?.sliceToDelta(index, length + index);
};

function processSnapshot(
  snapshot: BlockSnapshot,
  text: TextSelection,
  host: EditorHost
) {
  const model = host.doc.getBlockById(snapshot.id);
  assertExists(model);

  const modelId = model.id;
  if (text.from.blockId === modelId) {
    updateSnapshotText(text.from, snapshot, model);
  }
  if (text.to && text.to.blockId === modelId) {
    updateSnapshotText(text.to, snapshot, model);
  }

  // If the snapshot has children, handle them recursively
  snapshot.children.forEach(childSnapshot =>
    processSnapshot(childSnapshot, text, host)
  );
}

/**
 * Processes the text in the given snapshot if there is a text selection.
 * Only the selected portion of the snapshot will be processed.
 */
function processTextInSnapshot(snapshot: SliceSnapshot, host: EditorHost) {
  const { content } = snapshot;
  const text = host.selection.find(TextSelection);
  if (!content.length || !text) return;

  content.forEach(snapshot => processSnapshot(snapshot, text, host));
}

export async function getContentFromSlice(
  host: EditorHost,
  slice: Slice,
  type: 'markdown' | 'plain-text' = 'markdown'
) {
  const transformer = new Transformer({
    schema: host.std.store.workspace.schema,
    blobCRUD: host.std.store.workspace.blobSync,
    docCRUD: {
      create: (id: string) => host.std.store.workspace.createDoc({ id }),
      get: (id: string) => host.std.store.workspace.getDoc(id),
      delete: (id: string) => host.std.store.workspace.removeDoc(id),
    },
    middlewares: [
      titleMiddleware(host.std.store.workspace.meta.docMetas),
      embedSyncedDocMiddleware('content'),
    ],
  });
  const snapshot = transformer.sliceToSnapshot(slice);
  if (!snapshot) {
    return '';
  }
  processTextInSnapshot(snapshot, host);
  const adapter =
    type === 'markdown'
      ? new MarkdownAdapter(transformer, host.std.provider)
      : new PlainTextAdapter(transformer, host.std.provider);
  const content = await adapter.fromSliceSnapshot({
    snapshot,
    assets: transformer.assetsManager,
  });
  return content.file;
}

export async function getPlainTextFromSlice(host: EditorHost, slice: Slice) {
  const transformer = new Transformer({
    schema: host.std.store.workspace.schema,
    blobCRUD: host.std.store.workspace.blobSync,
    docCRUD: {
      create: (id: string) => host.std.store.workspace.createDoc({ id }),
      get: (id: string) => host.std.store.workspace.getDoc(id),
      delete: (id: string) => host.std.store.workspace.removeDoc(id),
    },
    middlewares: [titleMiddleware(host.std.store.workspace.meta.docMetas)],
  });
  const snapshot = transformer.sliceToSnapshot(slice);
  if (!snapshot) {
    return '';
  }
  processTextInSnapshot(snapshot, host);
  const plainTextAdapter = new PlainTextAdapter(transformer, host.std.provider);
  const plainText = await plainTextAdapter.fromSliceSnapshot({
    snapshot,
    assets: transformer.assetsManager,
  });
  return plainText.file;
}

export const markdownToSnapshot = async (
  markdown: string,
  host: EditorHost
) => {
  const transformer = new Transformer({
    schema: host.std.store.workspace.schema,
    blobCRUD: host.std.store.workspace.blobSync,
    docCRUD: {
      create: (id: string) => host.std.store.workspace.createDoc({ id }),
      get: (id: string) => host.std.store.workspace.getDoc(id),
      delete: (id: string) => host.std.store.workspace.removeDoc(id),
    },
    middlewares: [defaultImageProxyMiddleware, pasteMiddleware(host.std)],
  });
  const markdownAdapter = new MixTextAdapter(transformer, host.std.provider);
  const payload = {
    file: markdown,
    assets: transformer.assetsManager,
    workspaceId: host.std.store.workspace.id,
    pageId: host.std.store.id,
  };

  const snapshot = await markdownAdapter.toSliceSnapshot(payload);
  assertExists(snapshot, 'import markdown failed, expected to get a snapshot');

  return {
    snapshot,
    transformer,
  };
};

export async function insertFromMarkdown(
  host: EditorHost,
  markdown: string,
  doc: Store,
  parent?: string,
  index?: number
) {
  const { snapshot, transformer } = await markdownToSnapshot(markdown, host);

  const snapshots = snapshot.content.flatMap(x => x.children);

  const models: BlockModel[] = [];
  for (let i = 0; i < snapshots.length; i++) {
    const blockSnapshot = snapshots[i];
    const model = await transformer.snapshotToBlock(
      blockSnapshot,
      doc,
      parent,
      (index ?? 0) + i
    );
    if (model) {
      models.push(model);
    }
  }

  return models;
}

// FIXME: replace when selection is block is buggy right not
export async function replaceFromMarkdown(
  host: EditorHost,
  markdown: string,
  parent?: string,
  index?: number
) {
  const { snapshot, transformer } = await markdownToSnapshot(markdown, host);
  await transformer.snapshotToSlice(snapshot, host.doc, parent, index);
}

export async function markDownToDoc(
  provider: ServiceProvider,
  schema: Schema,
  answer: string,
  additionalMiddlewares?: TransformerMiddleware[]
) {
  // Should not create a new doc in the original collection
  const collection = new WorkspaceImpl({
    schema,
  });
  collection.meta.initialize();
  const middlewares = [defaultImageProxyMiddleware];
  if (additionalMiddlewares) {
    middlewares.push(...additionalMiddlewares);
  }
  const transformer = new Transformer({
    schema: collection.schema,
    blobCRUD: collection.blobSync,
    docCRUD: {
      create: (id: string) => collection.createDoc({ id }),
      get: (id: string) => collection.getDoc(id),
      delete: (id: string) => collection.removeDoc(id),
    },
    middlewares,
  });
  const mdAdapter = new MarkdownAdapter(transformer, provider);
  const doc = await mdAdapter.toDoc({
    file: answer,
    assets: transformer.assetsManager,
  });
  if (!doc) {
    console.error('Failed to convert markdown to doc');
  }
  return doc as Store;
}
