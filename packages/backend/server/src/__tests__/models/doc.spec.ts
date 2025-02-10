import { randomUUID } from 'node:crypto';

import ava, { TestFn } from 'ava';

import { Config } from '../../base/config';
import { DocModel } from '../../models/doc';
import { type User, UserModel } from '../../models/user';
import { type Workspace, WorkspaceModel } from '../../models/workspace';
import { createTestingModule, type TestingModule } from '../utils';

interface Context {
  config: Config;
  module: TestingModule;
  user: UserModel;
  workspace: WorkspaceModel;
  doc: DocModel;
}

const test = ava as TestFn<Context>;

test.before(async t => {
  const module = await createTestingModule();

  t.context.user = module.get(UserModel);
  t.context.workspace = module.get(WorkspaceModel);
  t.context.doc = module.get(DocModel);
  t.context.config = module.get(Config);
  t.context.module = module;
});

let user: User;
let workspace: Workspace;

test.beforeEach(async t => {
  await t.context.module.initTestingDB();
  user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  workspace = await t.context.workspace.create(user.id);
});

test.after(async t => {
  await t.context.module.close();
});

test('should create a batch updates on a doc', async t => {
  const docId = randomUUID();
  const updates = await t.context.doc.createUpdates([
    {
      spaceId: workspace.id,
      docId,
      blob: Buffer.from('blob1'),
      timestamp: Date.now(),
      editorId: user.id,
    },
    {
      spaceId: workspace.id,
      docId,
      blob: Buffer.from('blob2'),
      timestamp: Date.now() + 1000,
    },
  ]);
  t.is(updates.count, 2);
});

test('should create error when createdAt timestamp is not unique', async t => {
  const docId = randomUUID();
  const timestamp = Date.now();
  await t.context.doc.createUpdates([
    {
      spaceId: workspace.id,
      docId,
      blob: Buffer.from('blob1'),
      timestamp,
      editorId: user.id,
    },
  ]);
  await t.throwsAsync(
    t.context.doc.createUpdates([
      {
        spaceId: workspace.id,
        docId,
        blob: Buffer.from('blob2'),
        timestamp,
        editorId: user.id,
      },
    ]),
    {
      message:
        /Unique constraint failed on the fields: \(`workspace_id`,`guid`,`created_at`\)/,
    }
  );
});

test('should find updates by spaceId and docId', async t => {
  const docId = randomUUID();
  await t.context.doc.createUpdates([
    {
      spaceId: workspace.id,
      docId,
      blob: Buffer.from('blob1'),
      timestamp: Date.now(),
      editorId: user.id,
    },
    {
      spaceId: workspace.id,
      docId,
      blob: Buffer.from('blob2'),
      timestamp: Date.now() + 1000,
      editorId: user.id,
    },
  ]);
  const foundUpdates = await t.context.doc.findUpdates(workspace.id, docId);
  t.is(foundUpdates.length, 2);
  t.deepEqual(foundUpdates[0].blob, Buffer.from('blob1'));
  t.deepEqual(foundUpdates[1].blob, Buffer.from('blob2'));

  let count = await t.context.doc.getUpdateCount(workspace.id, docId);
  t.is(count, 2);
  await t.context.doc.createUpdates([
    {
      spaceId: workspace.id,
      docId,
      blob: Buffer.from('blob3'),
      timestamp: Date.now(),
      editorId: user.id,
    },
  ]);
  count = await t.context.doc.getUpdateCount(workspace.id, docId);
  t.is(count, 3);
});

test('should delete updates by spaceId, docId, and createdAts', async t => {
  const docId = randomUUID();
  const timestamps = [Date.now(), Date.now() + 1000];
  await t.context.doc.createUpdates([
    {
      spaceId: workspace.id,
      docId,
      blob: Buffer.from('blob1'),
      timestamp: timestamps[0],
      editorId: user.id,
    },
    {
      spaceId: workspace.id,
      docId,
      blob: Buffer.from('blob2'),
      timestamp: timestamps[1],
    },
  ]);
  let count = await t.context.doc.deleteUpdates(
    workspace.id,
    docId,
    timestamps
  );
  t.is(count, 2);
  count = await t.context.doc.getUpdateCount(workspace.id, docId);
  t.is(count, 0);

  // delete non-existing updates
  count = await t.context.doc.deleteUpdates(workspace.id, docId, timestamps);
  t.is(count, 0);
});

test('should get global update count', async t => {
  const docId = randomUUID();
  const docId2 = randomUUID();
  await t.context.doc.createUpdates([
    {
      spaceId: workspace.id,
      docId,
      blob: Buffer.from('blob1'),
      timestamp: Date.now(),
      editorId: user.id,
    },
    {
      spaceId: workspace.id,
      docId,
      blob: Buffer.from('blob2'),
      timestamp: Date.now() + 1000,
      editorId: user.id,
    },
    {
      spaceId: workspace.id,
      docId: docId2,
      blob: Buffer.from('blob2'),
      timestamp: Date.now() + 1000,
      editorId: user.id,
    },
  ]);
  const count = await t.context.doc.getGlobalUpdateCount();
  t.is(count, 3);
});

test('should upsert a doc', async t => {
  const snapshot = {
    spaceId: workspace.id,
    docId: randomUUID(),
    blob: Buffer.from('blob1'),
    timestamp: Date.now(),
    editorId: user.id,
  };
  await t.context.doc.upsert(snapshot);
  const foundSnapshot = await t.context.doc.get(
    snapshot.spaceId,
    snapshot.docId
  );
  t.truthy(foundSnapshot);
  t.deepEqual(foundSnapshot!.blob, snapshot.blob);
  t.is(foundSnapshot!.editorId, user.id);
  t.is(foundSnapshot!.timestamp, snapshot.timestamp);

  // update snapshot's editorId
  const otherUser = await t.context.user.create({
    email: 'test2@affine.pro',
  });
  const newSnapshot = {
    ...snapshot,
    editorId: otherUser.id,
  };
  await t.context.doc.upsert(newSnapshot);
  const updatedSnapshot = await t.context.doc.get(
    snapshot.spaceId,
    snapshot.docId
  );
  t.truthy(updatedSnapshot);
  t.deepEqual(updatedSnapshot!.blob, snapshot.blob);
  t.is(updatedSnapshot!.editorId, otherUser.id);
});

test('should get a doc meta', async t => {
  const snapshot = {
    spaceId: workspace.id,
    docId: randomUUID(),
    blob: Buffer.from('blob1'),
    timestamp: Date.now(),
    editorId: user.id,
  };
  await t.context.doc.upsert(snapshot);
  const meta = await t.context.doc.getMeta(snapshot.spaceId, snapshot.docId);
  t.truthy(meta);
  t.deepEqual(meta!.createdByUser, {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
  });
  t.deepEqual(meta!.updatedByUser, {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
  });
  t.truthy(meta!.createdAt);
  t.deepEqual(meta!.updatedAt, new Date(snapshot.timestamp));

  // update snapshot's editorId
  const otherUser = await t.context.user.create({
    email: 'test2@affine.pro',
  });
  const newSnapshot = {
    ...snapshot,
    editorId: otherUser.id,
    timestamp: Date.now(),
  };
  await t.context.doc.upsert(newSnapshot);
  const updatedSnapshotMeta = await t.context.doc.getMeta(
    snapshot.spaceId,
    snapshot.docId
  );
  t.truthy(updatedSnapshotMeta);
  t.deepEqual(updatedSnapshotMeta!.createdByUser, {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
  });
  t.deepEqual(updatedSnapshotMeta!.updatedByUser, {
    id: otherUser.id,
    name: otherUser.name,
    avatarUrl: otherUser.avatarUrl,
  });
  // createdAt should not change
  t.deepEqual(updatedSnapshotMeta!.createdAt, meta!.createdAt);
  t.deepEqual(updatedSnapshotMeta!.updatedAt, new Date(newSnapshot.timestamp));

  // get null when doc not found
  const notFoundMeta = await t.context.doc.getMeta(
    snapshot.spaceId,
    randomUUID()
  );
  t.is(notFoundMeta, null);
});

test('should create a history record', async t => {
  const snapshot = {
    spaceId: workspace.id,
    docId: randomUUID(),
    blob: Buffer.from('blob1'),
    timestamp: Date.now(),
    editorId: user.id,
  };
  await t.context.doc.upsert(snapshot);
  const created = await t.context.doc.createHistory(snapshot, 1000);
  t.truthy(created);
  t.deepEqual(created.timestamp, snapshot.timestamp);
  t.deepEqual(created.editor, {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
  });
  const history = await t.context.doc.getHistory(
    snapshot.spaceId,
    snapshot.docId,
    snapshot.timestamp
  );
  t.deepEqual(history, {
    ...created,
    blob: snapshot.blob,
  });
});

test('should return null when history timestamp not match', async t => {
  const snapshot = {
    spaceId: workspace.id,
    docId: randomUUID(),
    blob: Buffer.from('blob1'),
    timestamp: Date.now(),
    editorId: user.id,
  };
  await t.context.doc.upsert(snapshot);
  await t.context.doc.createHistory(snapshot, 1000);
  const history = await t.context.doc.getHistory(
    snapshot.spaceId,
    snapshot.docId,
    snapshot.timestamp + 1
  );
  t.is(history, null);
});

test('should find history records', async t => {
  const docId = randomUUID();
  const snapshot1 = {
    spaceId: workspace.id,
    docId,
    blob: Buffer.from('blob1'),
    timestamp: Date.now() - 1000,
    editorId: user.id,
  };
  const snapshot2 = {
    spaceId: workspace.id,
    docId,
    blob: Buffer.from('blob2'),
    timestamp: Date.now(),
    editorId: user.id,
  };
  await t.context.doc.createHistory(snapshot1, 1000);
  await t.context.doc.createHistory(snapshot2, 1000);
  let histories = await t.context.doc.findHistories(workspace.id, docId);
  t.is(histories.length, 2);
  t.deepEqual(histories[0].timestamp, snapshot2.timestamp);
  t.deepEqual(histories[0].editor, {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
  });
  t.deepEqual(histories[1].timestamp, snapshot1.timestamp);
  t.deepEqual(histories[1].editor, {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
  });
  // only take 1 history, order by timestamp desc
  histories = await t.context.doc.findHistories(workspace.id, docId, {
    take: 1,
  });
  t.is(histories.length, 1);
  t.deepEqual(histories[0].timestamp, snapshot2.timestamp);
  t.deepEqual(histories[0].editor, {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
  });
  // get empty history
  histories = await t.context.doc.findHistories(workspace.id, docId, {
    before: Date.now() - 1000000,
  });
  t.is(histories.length, 0);
});

test('should get latest history', async t => {
  const docId = randomUUID();
  const snapshot1 = {
    spaceId: workspace.id,
    docId,
    blob: Buffer.from('blob1'),
    timestamp: Date.now() - 1000,
    editorId: user.id,
  };
  const snapshot2 = {
    spaceId: workspace.id,
    docId,
    blob: Buffer.from('blob2'),
    timestamp: Date.now(),
    editorId: user.id,
  };
  await t.context.doc.createHistory(snapshot1, 1000);
  await t.context.doc.createHistory(snapshot2, 1000);
  const history = await t.context.doc.getLatestHistory(workspace.id, docId);
  t.truthy(history);
  t.deepEqual(history!.timestamp, snapshot2.timestamp);
  t.deepEqual(history!.editor, {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
  });
  // return null when no history
  const emptyHistory = await t.context.doc.getLatestHistory(
    workspace.id,
    randomUUID()
  );
  t.is(emptyHistory, null);
});

test('should delete a doc, including histories, snapshots and updates', async t => {
  const docId = randomUUID();
  const snapshot = {
    spaceId: workspace.id,
    docId,
    blob: Buffer.from('blob1'),
    timestamp: Date.now(),
    editorId: user.id,
  };
  await t.context.doc.upsert(snapshot);
  await t.context.doc.createHistory(snapshot, 1000);
  await t.context.doc.createUpdates([
    {
      spaceId: workspace.id,
      docId,
      blob: Buffer.from('blob2'),
      timestamp: Date.now(),
      editorId: user.id,
    },
  ]);
  await t.context.doc.delete(workspace.id, docId);
  const foundSnapshot = await t.context.doc.get(workspace.id, docId);
  t.is(foundSnapshot, null);
  const foundHistory = await t.context.doc.getLatestHistory(
    workspace.id,
    docId
  );
  t.is(foundHistory, null);
  const foundUpdates = await t.context.doc.findUpdates(workspace.id, docId);
  t.is(foundUpdates.length, 0);
});

test('should delete all docs in a workspace', async t => {
  const docId1 = randomUUID();
  const docId2 = randomUUID();
  const snapshot1 = {
    spaceId: workspace.id,
    docId: docId1,
    blob: Buffer.from('blob1'),
    timestamp: Date.now(),
    editorId: user.id,
  };
  const snapshot2 = {
    spaceId: workspace.id,
    docId: docId2,
    blob: Buffer.from('blob2'),
    timestamp: Date.now(),
    editorId: user.id,
  };
  await t.context.doc.upsert(snapshot1);
  await t.context.doc.createHistory(snapshot1, 1000);
  await t.context.doc.createUpdates([
    {
      spaceId: workspace.id,
      docId: docId1,
      blob: Buffer.from('blob2'),
      timestamp: Date.now(),
      editorId: user.id,
    },
  ]);
  await t.context.doc.upsert(snapshot2);
  await t.context.doc.createHistory(snapshot2, 1000);
  await t.context.doc.createUpdates([
    {
      spaceId: workspace.id,
      docId: docId2,
      blob: Buffer.from('blob2'),
      timestamp: Date.now(),
      editorId: user.id,
    },
  ]);
  const deletedCount = await t.context.doc.deleteAllByWorkspaceId(workspace.id);
  t.is(deletedCount, 2);
  const foundSnapshot1 = await t.context.doc.get(workspace.id, docId1);
  t.is(foundSnapshot1, null);
  const foundHistory1 = await t.context.doc.getLatestHistory(
    workspace.id,
    docId1
  );
  t.is(foundHistory1, null);
  const foundUpdates1 = await t.context.doc.findUpdates(workspace.id, docId1);
  t.is(foundUpdates1.length, 0);
  const foundSnapshot2 = await t.context.doc.get(workspace.id, docId2);
  t.is(foundSnapshot2, null);
  const foundHistory2 = await t.context.doc.getLatestHistory(
    workspace.id,
    docId2
  );
  t.is(foundHistory2, null);
  const foundUpdates2 = await t.context.doc.findUpdates(workspace.id, docId2);
  t.is(foundUpdates2.length, 0);
});

test('should find all docs timestamps in a workspace', async t => {
  const docId1 = randomUUID();
  const docId2 = randomUUID();
  const timestamp1 = Date.now();
  const timestamp2 = Date.now() + 1000;
  const timestamp3 = Date.now() + 2000;
  const snapshot1 = {
    spaceId: workspace.id,
    docId: docId1,
    blob: Buffer.from('blob1'),
    timestamp: timestamp1,
    editorId: user.id,
  };
  const snapshot2 = {
    spaceId: workspace.id,
    docId: docId2,
    blob: Buffer.from('blob2'),
    timestamp: timestamp2,
    editorId: user.id,
  };
  await t.context.doc.upsert(snapshot1);
  await t.context.doc.createUpdates([
    {
      spaceId: workspace.id,
      docId: docId1,
      blob: Buffer.from('blob2'),
      timestamp: timestamp3,
      editorId: user.id,
    },
  ]);
  await t.context.doc.upsert(snapshot2);
  const timestamps = await t.context.doc.findTimestampsByWorkspaceId(
    workspace.id
  );
  t.deepEqual(timestamps, {
    [docId1]: timestamp3,
    [docId2]: timestamp2,
  });
});

test('should detect doc exists or not', async t => {
  const docId = randomUUID();
  t.false(await t.context.doc.exists(workspace.id, docId));
  const snapshot = {
    spaceId: workspace.id,
    docId: docId,
    blob: Buffer.from('blob1'),
    timestamp: Date.now(),
    editorId: user.id,
  };
  await t.context.doc.upsert(snapshot);
  t.true(await t.context.doc.exists(workspace.id, docId));
});

test('should detect doc exists on only updates exists', async t => {
  const docId = randomUUID();
  await t.context.doc.createUpdates([
    {
      spaceId: workspace.id,
      docId: docId,
      blob: Buffer.from('blob2'),
      timestamp: Date.now(),
      editorId: user.id,
    },
  ]);
  t.true(await t.context.doc.exists(workspace.id, docId));
});
