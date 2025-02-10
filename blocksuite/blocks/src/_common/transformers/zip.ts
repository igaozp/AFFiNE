import { sha } from '@blocksuite/global/utils';
import type { DocSnapshot, Store, Workspace } from '@blocksuite/store';
import { extMimeMap, getAssetName, Transformer } from '@blocksuite/store';

import { download, Unzip, Zip } from '../transformers/utils.js';
import { replaceIdMiddleware, titleMiddleware } from './middlewares.js';

async function exportDocs(collection: Workspace, docs: Store[]) {
  const zip = new Zip();
  const job = new Transformer({
    schema: collection.schema,
    blobCRUD: collection.blobSync,
    docCRUD: {
      create: (id: string) => collection.createDoc({ id }),
      get: (id: string) => collection.getDoc(id),
      delete: (id: string) => collection.removeDoc(id),
    },
    middlewares: [
      replaceIdMiddleware(collection.idGenerator),
      titleMiddleware(collection.meta.docMetas),
    ],
  });
  const snapshots = await Promise.all(docs.map(job.docToSnapshot));

  await Promise.all(
    snapshots
      .filter((snapshot): snapshot is DocSnapshot => !!snapshot)
      .map(async snapshot => {
        const snapshotName = `${snapshot.meta.title || 'untitled'}.snapshot.json`;
        await zip.file(snapshotName, JSON.stringify(snapshot, null, 2));
      })
  );

  const assets = zip.folder('assets');
  const pathBlobIdMap = job.assetsManager.getPathBlobIdMap();
  const assetsMap = job.assets;

  await Promise.all(
    Array.from(pathBlobIdMap.values()).map(async blobId => {
      await job.assetsManager.readFromBlob(blobId);
      const ext = getAssetName(assetsMap, blobId).split('.').at(-1);
      const blob = assetsMap.get(blobId);
      if (blob) {
        await assets.file(`${blobId}.${ext}`, blob);
      }
    })
  );

  const downloadBlob = await zip.generate();
  return download(downloadBlob, `${collection.id}.bs.zip`);
}

async function importDocs(collection: Workspace, imported: Blob) {
  const unzip = new Unzip();
  await unzip.load(imported);

  const assetBlobs: [string, Blob][] = [];
  const snapshotsBlobs: Blob[] = [];

  for (const { path, content: blob } of unzip) {
    if (path.includes('MACOSX') || path.includes('DS_Store')) {
      continue;
    }

    if (path.startsWith('assets/')) {
      assetBlobs.push([path, blob]);
      continue;
    }

    if (path === 'info.json') {
      continue;
    }

    if (path.endsWith('.snapshot.json')) {
      snapshotsBlobs.push(blob);
      continue;
    }
  }

  const job = new Transformer({
    schema: collection.schema,
    blobCRUD: collection.blobSync,
    docCRUD: {
      create: (id: string) => collection.createDoc({ id }),
      get: (id: string) => collection.getDoc(id),
      delete: (id: string) => collection.removeDoc(id),
    },
    middlewares: [
      replaceIdMiddleware(collection.idGenerator),
      titleMiddleware(collection.meta.docMetas),
    ],
  });
  const assetsMap = job.assets;

  assetBlobs.forEach(([name, blob]) => {
    const nameWithExt = name.replace('assets/', '');
    const assetsId = nameWithExt.replace(/\.[^/.]+$/, '');
    const ext = nameWithExt.split('.').at(-1) ?? '';
    const mime = extMimeMap.get(ext) ?? '';
    const file = new File([blob], nameWithExt, {
      type: mime,
    });
    assetsMap.set(assetsId, file);
  });

  return Promise.all(
    snapshotsBlobs.map(async blob => {
      const json = await blob.text();
      const snapshot = JSON.parse(json) as DocSnapshot;
      const tasks: Promise<void>[] = [];

      job.walk(snapshot, block => {
        const sourceId = block.props?.sourceId as string | undefined;

        if (sourceId && sourceId.startsWith('/')) {
          const removeSlashId = sourceId.replace(/^\//, '');

          if (assetsMap.has(removeSlashId)) {
            const blob = assetsMap.get(removeSlashId)!;

            tasks.push(
              blob
                .arrayBuffer()
                .then(buffer => sha(buffer))
                .then(hash => {
                  assetsMap.set(hash, blob);
                  block.props.sourceId = hash;
                })
            );
          }
        }
      });

      await Promise.all(tasks);

      return job.snapshotToDoc(snapshot);
    })
  );
}

export const ZipTransformer = {
  exportDocs,
  importDocs,
};
