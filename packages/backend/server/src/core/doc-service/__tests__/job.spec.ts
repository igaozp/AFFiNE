import { mock } from 'node:test';

import { ScheduleModule } from '@nestjs/schedule';
import ava, { TestFn } from 'ava';
import * as Sinon from 'sinon';
import { Doc as YDoc } from 'yjs';

import {
  createTestingModule,
  type TestingModule,
} from '../../../__tests__/utils';
import { Config } from '../../../base';
import {
  DocStorageModule,
  PgWorkspaceDocStorageAdapter,
} from '../../../core/doc';
import { Models } from '../../../models';
import { DocServiceModule } from '..';
import { DocServiceCronJob } from '../job';

interface Context {
  timer: Sinon.SinonFakeTimers;
  module: TestingModule;
  cronJob: DocServiceCronJob;
  config: Config;
  adapter: PgWorkspaceDocStorageAdapter;
  models: Models;
}

const test = ava as TestFn<Context>;

// cleanup database before each test
test.before(async t => {
  t.context.timer = Sinon.useFakeTimers({
    toFake: ['setInterval'],
  });
  t.context.module = await createTestingModule({
    imports: [ScheduleModule.forRoot(), DocStorageModule, DocServiceModule],
  });

  t.context.cronJob = t.context.module.get(DocServiceCronJob);
  t.context.config = t.context.module.get(Config);
  t.context.adapter = t.context.module.get(PgWorkspaceDocStorageAdapter);
  t.context.models = t.context.module.get(Models);
});

test.beforeEach(async t => {
  await t.context.module.initTestingDB();
});

test.afterEach(async t => {
  t.context.timer.restore();
  Sinon.restore();
  mock.reset();
});

test.after.always(async t => {
  await t.context.module.close();
});

test('should poll when interval due', async t => {
  const cronJob = t.context.cronJob;
  const interval = t.context.config.doc.manager.updatePollInterval;

  let resolve: any;
  const fake = mock.method(cronJob, 'autoMergePendingDocUpdates', () => {
    return new Promise(_resolve => {
      resolve = _resolve;
    });
  });

  t.context.timer.tick(interval);
  t.is(fake.mock.callCount(), 1);

  // busy
  t.context.timer.tick(interval);
  // @ts-expect-error private member
  t.is(cronJob.busy, true);
  t.is(fake.mock.callCount(), 1);

  resolve();
  await t.context.timer.tickAsync(1);

  // @ts-expect-error private member
  t.is(cronJob.busy, false);
  t.context.timer.tick(interval);
  t.is(fake.mock.callCount(), 2);
});

test('should auto merge pending doc updates', async t => {
  const doc = new YDoc();
  const text = doc.getText('content');
  const updates: Buffer[] = [];

  doc.on('update', update => {
    updates.push(Buffer.from(update));
  });

  text.insert(0, 'hello');
  text.insert(5, 'world');
  text.insert(5, ' ');

  await t.context.adapter.pushDocUpdates('2', '2', updates);
  await t.context.cronJob.autoMergePendingDocUpdates();
  const rows = await t.context.models.doc.findUpdates('2', '2');
  t.is(rows.length, 0);
  // again should merge nothing
  await t.context.cronJob.autoMergePendingDocUpdates();
});
