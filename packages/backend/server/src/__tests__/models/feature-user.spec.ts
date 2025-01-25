import { TestingModule } from '@nestjs/testing';
import { PrismaClient, User } from '@prisma/client';
import ava, { TestFn } from 'ava';

import { UserFeatureModel, UserModel } from '../../models';
import { createTestingModule, initTestingDB } from '../utils';

interface Context {
  module: TestingModule;
  model: UserFeatureModel;
  u1: User;
}

const test = ava as TestFn<Context>;

test.before(async t => {
  const module = await createTestingModule({});

  t.context.model = module.get(UserFeatureModel);
  t.context.module = module;
});

test.beforeEach(async t => {
  await initTestingDB(t.context.module.get(PrismaClient));
  t.context.u1 = await t.context.module.get(UserModel).create({
    email: 'u1@affine.pro',
    registered: true,
  });
});

test.after(async t => {
  await t.context.module.close();
});

test('should get null if user feature not found', async t => {
  const { model, u1 } = t.context;
  const userFeature = await model.get(u1.id, 'ai_early_access');
  t.is(userFeature, null);
});

test('should get user feature', async t => {
  const { model, u1 } = t.context;
  const userFeature = await model.get(u1.id, 'free_plan_v1');
  t.is(userFeature?.feature, 'free_plan_v1');
});

test('should list user features', async t => {
  const { model, u1 } = t.context;

  t.like(await model.list(u1.id), ['free_plan_v1']);
});

test('should directly test user feature existence', async t => {
  const { model, u1 } = t.context;

  t.true(await model.has(u1.id, 'free_plan_v1'));
  t.false(await model.has(u1.id, 'ai_early_access'));
});

test('should add user feature', async t => {
  const { model, u1 } = t.context;

  await model.add(u1.id, 'unlimited_copilot', 'test');
  t.true(await model.has(u1.id, 'unlimited_copilot'));
  t.true((await model.list(u1.id)).includes('unlimited_copilot'));
});

test('should not add existing user feature', async t => {
  const { model, u1 } = t.context;

  await model.add(u1.id, 'free_plan_v1', 'test');
  await model.add(u1.id, 'free_plan_v1', 'test');

  t.like(await model.list(u1.id), ['free_plan_v1']);
});

test('should remove user feature', async t => {
  const { model, u1 } = t.context;

  await model.remove(u1.id, 'free_plan_v1');
  t.false(await model.has(u1.id, 'free_plan_v1'));
  t.false((await model.list(u1.id)).includes('free_plan_v1'));
});

test('should switch user feature', async t => {
  const { model, u1 } = t.context;

  await model.switch(u1.id, 'free_plan_v1', 'pro_plan_v1', 'test');

  t.false(await model.has(u1.id, 'free_plan_v1'));
  t.true(await model.has(u1.id, 'pro_plan_v1'));

  t.false((await model.list(u1.id)).includes('free_plan_v1'));
  t.true((await model.list(u1.id)).includes('pro_plan_v1'));
});
