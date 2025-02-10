import { randomUUID } from 'node:crypto';

import { User, Workspace } from '@prisma/client';
import ava, { TestFn } from 'ava';

import { createTestingApp, type TestingApp } from '../../../__tests__/utils';
import { AppModule } from '../../../app.module';
import { ConfigModule } from '../../../base/config';
import { Models } from '../../../models';
import { DocReader } from '..';
import { DatabaseDocReader } from '../reader';

const test = ava as TestFn<{
  models: Models;
  app: TestingApp;
  docReader: DocReader;
}>;

test.before(async t => {
  const app = await createTestingApp({
    imports: [ConfigModule.forRoot(), AppModule],
  });

  t.context.models = app.get(Models);
  t.context.docReader = app.get(DocReader);
  t.context.app = app;
});

let user: User;
let workspace: Workspace;

test.beforeEach(async t => {
  await t.context.app.initTestingDB();
  user = await t.context.models.user.create({
    email: 'test@affine.pro',
  });
  workspace = await t.context.models.workspace.create(user.id);
});

test.after.always(async t => {
  await t.context.app.close();
});

test('should return null when doc not found', async t => {
  const { docReader } = t.context;
  const docId = randomUUID();
  const doc = await docReader.getDoc(workspace.id, docId);
  t.is(doc, null);
});

test('should return doc when found', async t => {
  const { docReader } = t.context;
  t.true(docReader instanceof DatabaseDocReader);

  const docId = randomUUID();
  const timestamp = Date.now();
  await t.context.models.doc.createUpdates([
    {
      spaceId: workspace.id,
      docId,
      blob: Buffer.from('blob1 data'),
      timestamp,
      editorId: user.id,
    },
  ]);

  const doc = await docReader.getDoc(workspace.id, docId);
  t.truthy(doc);
  t.is(doc!.bin.toString(), 'blob1 data');
  t.is(doc!.timestamp, timestamp);
  t.is(doc!.editor, user.id);
});
