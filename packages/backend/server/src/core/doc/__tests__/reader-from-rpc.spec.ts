import { randomUUID } from 'node:crypto';
import { mock } from 'node:test';

import { User, Workspace } from '@prisma/client';
import ava, { TestFn } from 'ava';

import { createTestingApp, type TestingApp } from '../../../__tests__/utils';
import { AppModule } from '../../../app.module';
import { Config, InternalServerError } from '../../../base';
import { ConfigModule } from '../../../base/config';
import { Models } from '../../../models';
import { DocReader } from '..';
import { RpcDocReader } from '../reader';

const test = ava as TestFn<{
  models: Models;
  app: TestingApp;
  docReader: DocReader;
  config: Config;
}>;

test.before(async t => {
  const app = await createTestingApp({
    imports: [
      ConfigModule.forRoot({
        flavor: {
          doc: false,
        },
        docService: {
          endpoint: '',
        },
      }),
      AppModule,
    ],
  });

  t.context.models = app.get(Models);
  t.context.docReader = app.get(DocReader);
  t.context.config = app.get(Config);
  t.context.app = app;
});

let user: User;
let workspace: Workspace;

test.beforeEach(async t => {
  t.context.config.docService.endpoint = t.context.app.url();
  await t.context.app.initTestingDB();
  user = await t.context.models.user.create({
    email: 'test@affine.pro',
  });
  workspace = await t.context.models.workspace.create(user.id);
});

test.afterEach.always(() => {
  mock.reset();
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

test('should throw error when doc service internal error', async t => {
  const { docReader } = t.context;
  const docId = randomUUID();
  mock.method(docReader, 'getDoc', async () => {
    throw new InternalServerError('mock doc service internal error');
  });
  await t.throwsAsync(docReader.getDoc(workspace.id, docId), {
    instanceOf: InternalServerError,
  });
});

test('should fallback to database doc service when endpoint network error', async t => {
  const { docReader } = t.context;
  t.context.config.docService.endpoint = 'http://localhost:13010';
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

test('should return doc when found', async t => {
  const { docReader } = t.context;
  t.true(docReader instanceof RpcDocReader);

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
