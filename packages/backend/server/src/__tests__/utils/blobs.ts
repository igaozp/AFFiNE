import { TestingApp } from './testing-app';

export async function listBlobs(
  app: TestingApp,
  workspaceId: string
): Promise<string[]> {
  const res = await app.gql(`
    query {
      listBlobs(workspaceId: "${workspaceId}")
    }
  `);
  return res.listBlobs;
}

export async function getWorkspaceBlobsSize(
  app: TestingApp,
  workspaceId: string
): Promise<number> {
  const res = await app.gql(`
    query {
      workspace(id: "${workspaceId}") {
        blobsSize
      }
    }
  `);
  return res.workspace.blobsSize;
}

export async function collectAllBlobSizes(app: TestingApp): Promise<number> {
  const res = await app.gql(`
    query {
      currentUser {
        quotaUsage {
          storageQuota
        }
      }
    }
  `);
  return res.currentUser.quotaUsage.storageQuota;
}

export async function setBlob(
  app: TestingApp,
  workspaceId: string,
  buffer: Buffer
): Promise<string> {
  const res = await app
    .POST('/graphql')
    .set({ 'x-request-id': 'test', 'x-operation-name': 'test' })
    .field(
      'operations',
      JSON.stringify({
        name: 'setBlob',
        query: `mutation setBlob($blob: Upload!) {
              setBlob(workspaceId: "${workspaceId}", blob: $blob)
            }`,
        variables: { blob: null },
      })
    )
    .field('map', JSON.stringify({ '0': ['variables.blob'] }))
    .attach(
      '0',
      buffer,
      `blob-${Math.random().toString(16).substring(2, 10)}.data`
    )
    .expect(200);
  return res.body.data.setBlob;
}
