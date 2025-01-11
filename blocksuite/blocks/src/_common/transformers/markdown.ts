import { MarkdownAdapter } from '@blocksuite/affine-shared/adapters';
import { Container } from '@blocksuite/global/di';
import { BlockSuiteError, ErrorCode } from '@blocksuite/global/exceptions';
import { assertExists, sha } from '@blocksuite/global/utils';
import type { Store, Workspace } from '@blocksuite/store';
import { extMimeMap, Transformer } from '@blocksuite/store';

import { defaultBlockMarkdownAdapterMatchers } from '../adapters/index.js';
import { inlineDeltaToMarkdownAdapterMatchers } from '../adapters/markdown/delta-converter/inline-delta.js';
import { markdownInlineToDeltaMatchers } from '../adapters/markdown/delta-converter/markdown-inline.js';
import {
  defaultImageProxyMiddleware,
  docLinkBaseURLMiddleware,
  fileNameMiddleware,
  titleMiddleware,
} from './middlewares.js';
import { createAssetsArchive, download, Unzip } from './utils.js';

const container = new Container();
[
  ...markdownInlineToDeltaMatchers,
  ...defaultBlockMarkdownAdapterMatchers,
  ...inlineDeltaToMarkdownAdapterMatchers,
].forEach(ext => {
  ext.setup(container);
});

const provider = container.provider();

type ImportMarkdownToBlockOptions = {
  doc: Store;
  markdown: string;
  blockId: string;
};

type ImportMarkdownToDocOptions = {
  collection: Workspace;
  markdown: string;
  fileName?: string;
};

type ImportMarkdownZipOptions = {
  collection: Workspace;
  imported: Blob;
};

/**
 * Exports a doc to a Markdown file or a zip archive containing Markdown and assets.
 * @param doc The doc to export
 * @returns A Promise that resolves when the export is complete
 */
async function exportDoc(doc: Store) {
  const job = new Transformer({
    schema: doc.schema,
    blobCRUD: doc.blobSync,
    docCRUD: {
      create: (id: string) => doc.workspace.createDoc({ id }),
      get: (id: string) => doc.workspace.getDoc(id),
      delete: (id: string) => doc.workspace.removeDoc(id),
    },
    middlewares: [
      docLinkBaseURLMiddleware(doc.workspace.id),
      titleMiddleware(doc.workspace.meta.docMetas),
    ],
  });
  const snapshot = job.docToSnapshot(doc);

  const adapter = new MarkdownAdapter(job, provider);
  if (!snapshot) {
    return;
  }

  const markdownResult = await adapter.fromDocSnapshot({
    snapshot,
    assets: job.assetsManager,
  });

  let downloadBlob: Blob;
  const docTitle = doc.meta?.title || 'Untitled';
  let name: string;
  const contentBlob = new Blob([markdownResult.file], { type: 'plain/text' });
  if (markdownResult.assetsIds.length > 0) {
    if (!job.assets) {
      throw new BlockSuiteError(ErrorCode.ValueNotExists, 'No assets found');
    }
    const zip = await createAssetsArchive(job.assets, markdownResult.assetsIds);

    await zip.file('index.md', contentBlob);

    downloadBlob = await zip.generate();
    name = `${docTitle}.zip`;
  } else {
    downloadBlob = contentBlob;
    name = `${docTitle}.md`;
  }
  download(downloadBlob, name);
}

/**
 * Imports Markdown content into a specific block within a doc.
 * @param options Object containing import options
 * @param options.doc The target doc
 * @param options.markdown The Markdown content to import
 * @param options.blockId The ID of the block where the content will be imported
 * @returns A Promise that resolves when the import is complete
 */
async function importMarkdownToBlock({
  doc,
  markdown,
  blockId,
}: ImportMarkdownToBlockOptions) {
  const job = new Transformer({
    schema: doc.schema,
    blobCRUD: doc.blobSync,
    docCRUD: {
      create: (id: string) => doc.workspace.createDoc({ id }),
      get: (id: string) => doc.workspace.getDoc(id),
      delete: (id: string) => doc.workspace.removeDoc(id),
    },
    middlewares: [
      defaultImageProxyMiddleware,
      docLinkBaseURLMiddleware(doc.workspace.id),
    ],
  });
  const adapter = new MarkdownAdapter(job, provider);
  const snapshot = await adapter.toSliceSnapshot({
    file: markdown,
    assets: job.assetsManager,
    workspaceId: doc.workspace.id,
    pageId: doc.id,
  });

  assertExists(snapshot, 'import markdown failed, expected to get a snapshot');

  const blocks = snapshot.content.flatMap(x => x.children);

  for (const block of blocks) {
    await job.snapshotToBlock(block, doc, blockId);
  }

  return;
}

/**
 * Imports Markdown content into a new doc within a collection.
 * @param options Object containing import options
 * @param options.collection The target doc collection
 * @param options.markdown The Markdown content to import
 * @param options.fileName Optional filename for the imported doc
 * @returns A Promise that resolves to the ID of the newly created doc, or undefined if import fails
 */
async function importMarkdownToDoc({
  collection,
  markdown,
  fileName,
}: ImportMarkdownToDocOptions) {
  const job = new Transformer({
    schema: collection.schema,
    blobCRUD: collection.blobSync,
    docCRUD: {
      create: (id: string) => collection.createDoc({ id }),
      get: (id: string) => collection.getDoc(id),
      delete: (id: string) => collection.removeDoc(id),
    },
    middlewares: [
      defaultImageProxyMiddleware,
      fileNameMiddleware(fileName),
      docLinkBaseURLMiddleware(collection.id),
    ],
  });
  const mdAdapter = new MarkdownAdapter(job, provider);
  const page = await mdAdapter.toDoc({
    file: markdown,
    assets: job.assetsManager,
  });
  if (!page) {
    return;
  }
  return page.id;
}

/**
 * Imports a zip file containing Markdown files and assets into a collection.
 * @param options Object containing import options
 * @param options.collection The target doc collection
 * @param options.imported The zip file as a Blob
 * @returns A Promise that resolves to an array of IDs of the newly created docs
 */
async function importMarkdownZip({
  collection,
  imported,
}: ImportMarkdownZipOptions) {
  const unzip = new Unzip();
  await unzip.load(imported);

  const docIds: string[] = [];
  const pendingAssets = new Map<string, File>();
  const pendingPathBlobIdMap = new Map<string, string>();
  const markdownBlobs: [string, Blob][] = [];

  for (const { path, content: blob } of unzip) {
    if (path.includes('__MACOSX') || path.includes('.DS_Store')) {
      continue;
    }

    const fileName = path.split('/').pop() ?? '';
    if (fileName.endsWith('.md')) {
      markdownBlobs.push([fileName, blob]);
    } else {
      const ext = path.split('.').at(-1) ?? '';
      const mime = extMimeMap.get(ext) ?? '';
      const key = await sha(await blob.arrayBuffer());
      pendingPathBlobIdMap.set(path, key);
      pendingAssets.set(key, new File([blob], fileName, { type: mime }));
    }
  }

  await Promise.all(
    markdownBlobs.map(async ([fileName, blob]) => {
      const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
      const job = new Transformer({
        schema: collection.schema,
        blobCRUD: collection.blobSync,
        docCRUD: {
          create: (id: string) => collection.createDoc({ id }),
          get: (id: string) => collection.getDoc(id),
          delete: (id: string) => collection.removeDoc(id),
        },
        middlewares: [
          defaultImageProxyMiddleware,
          fileNameMiddleware(fileNameWithoutExt),
          docLinkBaseURLMiddleware(collection.id),
        ],
      });
      const assets = job.assets;
      const pathBlobIdMap = job.assetsManager.getPathBlobIdMap();
      for (const [key, value] of pendingAssets.entries()) {
        assets.set(key, value);
      }
      for (const [key, value] of pendingPathBlobIdMap.entries()) {
        pathBlobIdMap.set(key, value);
      }
      const mdAdapter = new MarkdownAdapter(job, provider);
      const markdown = await blob.text();
      const doc = await mdAdapter.toDoc({
        file: markdown,
        assets: job.assetsManager,
      });
      if (doc) {
        docIds.push(doc.id);
      }
    })
  );
  return docIds;
}

export const MarkdownTransformer = {
  exportDoc,
  importMarkdownToBlock,
  importMarkdownToDoc,
  importMarkdownZip,
};
