import { TestingModule } from '@nestjs/testing';
import { PrismaClient, Workspace } from '@prisma/client';
import ava, { TestFn } from 'ava';

import { UserModel, WorkspaceFeatureModel, WorkspaceModel } from '../../models';
import { createTestingModule, initTestingDB } from '../utils';

interface Context {
  module: TestingModule;
  model: WorkspaceFeatureModel;
  ws: Workspace;
}

const test = ava as TestFn<Context>;

test.before(async t => {
  const module = await createTestingModule({});

  t.context.model = module.get(WorkspaceFeatureModel);
  t.context.module = module;
});

test.beforeEach(async t => {
  await initTestingDB(t.context.module.get(PrismaClient));
  const u1 = await t.context.module.get(UserModel).create({
    email: 'u1@affine.pro',
    registered: true,
  });

  t.context.ws = await t.context.module.get(WorkspaceModel).create(u1.id);
});

test.after(async t => {
  await t.context.module.close();
});

test('should get null if workspace feature not found', async t => {
  const { model, ws } = t.context;
  const userFeature = await model.get(ws.id, 'unlimited_workspace');
  t.is(userFeature, null);
});

test('should directly test workspace feature existence', async t => {
  const { model, ws } = t.context;

  t.false(await model.has(ws.id, 'unlimited_workspace'));
});

test('should list empty workspace features', async t => {
  const { model, ws } = t.context;

  t.deepEqual(await model.list(ws.id), []);
});

test('should add workspace feature', async t => {
  const { model, ws } = t.context;

  await model.add(ws.id, 'unlimited_workspace', 'test');
  t.is(
    (await model.get(ws.id, 'unlimited_workspace'))?.feature,
    'unlimited_workspace'
  );
  t.true(await model.has(ws.id, 'unlimited_workspace'));
  t.true((await model.list(ws.id)).includes('unlimited_workspace'));
});

test('should add workspace feature with overrides', async t => {
  const { model, ws } = t.context;

  await model.add(ws.id, 'team_plan_v1', 'test');
  const f1 = await model.get(ws.id, 'team_plan_v1');
  await model.add(ws.id, 'team_plan_v1', 'test', { memberLimit: 100 });
  const f2 = await model.get(ws.id, 'team_plan_v1');

  t.not(f1!.configs.memberLimit, f2!.configs.memberLimit);
  t.is(f2!.configs.memberLimit, 100);
});

test('should not add existing workspace feature', async t => {
  const { model, ws } = t.context;

  await model.add(ws.id, 'team_plan_v1', 'test');
  await model.add(ws.id, 'team_plan_v1', 'test');

  t.like(await model.list(ws.id), ['team_plan_v1']);
});

test('should replace existing workspace if overrides updated', async t => {
  const { model, ws } = t.context;

  await model.add(ws.id, 'team_plan_v1', 'test', { memberLimit: 10 });
  await model.add(ws.id, 'team_plan_v1', 'test', { memberLimit: 100 });
  const f2 = await model.get(ws.id, 'team_plan_v1');

  t.is(f2!.configs.memberLimit, 100);
});

test('should remove workspace feature', async t => {
  const { model, ws } = t.context;

  await model.add(ws.id, 'team_plan_v1', 'test');
  await model.remove(ws.id, 'team_plan_v1');
  t.false(await model.has(ws.id, 'team_plan_v1'));
  t.false((await model.list(ws.id)).includes('team_plan_v1'));
});

test('should switch workspace feature', async t => {
  const { model, ws } = t.context;

  await model.switch(ws.id, 'team_plan_v1', 'unlimited_workspace', 'test');

  t.false(await model.has(ws.id, 'team_plan_v1'));
  t.true(await model.has(ws.id, 'unlimited_workspace'));

  t.false((await model.list(ws.id)).includes('team_plan_v1'));
  t.true((await model.list(ws.id)).includes('unlimited_workspace'));
});

test('should switch workspace feature with overrides', async t => {
  const { model, ws } = t.context;

  await model.add(ws.id, 'unlimited_workspace', 'test');
  await model.add(ws.id, 'team_plan_v1', 'test', { memberLimit: 100 });
  const f2 = await model.get(ws.id, 'team_plan_v1');

  t.is(f2!.configs.memberLimit, 100);
});
