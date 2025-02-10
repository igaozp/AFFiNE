import type { TestFn } from 'ava';
import ava from 'ava';

import { createTestingApp, TestingApp, updateAvatar } from '../utils';

const test = ava as TestFn<{
  app: TestingApp;
}>;

test.before(async t => {
  const app = await createTestingApp();
  t.context.app = app;
});

test.beforeEach(async t => {
  await t.context.app.initTestingDB();
});

test.after.always(async t => {
  await t.context.app.close();
});

test('should be able to upload user avatar', async t => {
  const { app } = t.context;

  await app.signup('u1@affine.pro');
  const avatar = Buffer.from('test');
  const res = await updateAvatar(app, avatar);

  t.is(res.status, 200);
  const avatarUrl = res.body.data.uploadAvatar.avatarUrl;
  t.truthy(avatarUrl);

  const avatarRes = await app.GET(new URL(avatarUrl).pathname);

  t.deepEqual(avatarRes.body, Buffer.from('test'));
});

test('should be able to update user avatar, and invalidate old avatar url', async t => {
  const { app } = t.context;

  await app.signup('u1@affine.pro');
  const avatar = Buffer.from('test');
  let res = await updateAvatar(app, avatar);

  const oldAvatarUrl = res.body.data.uploadAvatar.avatarUrl;

  const newAvatar = Buffer.from('new');
  res = await updateAvatar(app, newAvatar);
  const newAvatarUrl = res.body.data.uploadAvatar.avatarUrl;

  t.not(oldAvatarUrl, newAvatarUrl);

  const avatarRes = await app.GET(new URL(oldAvatarUrl).pathname);
  t.is(avatarRes.status, 404);

  const newAvatarRes = await app.GET(new URL(newAvatarUrl).pathname);
  t.deepEqual(newAvatarRes.body, Buffer.from('new'));
});
