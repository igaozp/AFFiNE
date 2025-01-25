import { EventEmitter2 } from '@nestjs/event-emitter';
import { TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import ava, { TestFn } from 'ava';
import Sinon from 'sinon';

import { EmailAlreadyUsed } from '../../base';
import { Permission } from '../../models/common';
import { UserModel } from '../../models/user';
import { WorkspaceMemberStatus } from '../../models/workspace';
import { createTestingModule, initTestingDB } from '../utils';

interface Context {
  module: TestingModule;
  user: UserModel;
}

const test = ava as TestFn<Context>;

test.before(async t => {
  const module = await createTestingModule({});

  t.context.user = module.get(UserModel);
  t.context.module = module;
});

test.beforeEach(async t => {
  await initTestingDB(t.context.module.get(PrismaClient));
});

test.after(async t => {
  await t.context.module.close();
});

test('should create a new user', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });

  t.is(user.email, 'test@affine.pro');

  const user2 = await t.context.user.getUserByEmail('test@affine.pro');

  t.not(user2, null);
  t.is(user2!.email, 'test@affine.pro');
});

test('should trigger user.created event', async t => {
  const event = t.context.module.get(EventEmitter2);
  const spy = Sinon.spy();
  event.on('user.created', spy);

  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });

  t.true(spy.calledOnceWithExactly(user));
});

test('should sign in user with password', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
    password: 'password',
  });

  const signedInUser = await t.context.user.signIn(user.email, 'password');

  t.is(signedInUser.id, user.id);
  // Password is encrypted
  t.not(signedInUser.password, 'password');
});

test('should update an user', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });

  const user2 = await t.context.user.update(user.id, {
    email: 'test2@affine.pro',
  });

  t.is(user2.email, 'test2@affine.pro');
});

test('should update password', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
    password: 'password',
  });

  const updatedUser = await t.context.user.update(user.id, {
    password: 'new password',
  });

  t.not(updatedUser.password, user.password);
  // password is encrypted
  t.not(updatedUser.password, 'new password');
});

test('should not update email to an existing one', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const user2 = await t.context.user.create({
    email: 'test2@affine.pro',
  });

  await t.throwsAsync(
    () =>
      t.context.user.update(user.id, {
        email: user2.email,
      }),
    {
      instanceOf: EmailAlreadyUsed,
    }
  );
});

test('should trigger user.updated event', async t => {
  const event = t.context.module.get(EventEmitter2);
  const spy = Sinon.spy();
  event.on('user.updated', spy);

  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });

  const updatedUser = await t.context.user.update(user.id, {
    email: 'test2@affine.pro',
    name: 'new name',
  });

  t.true(spy.calledOnceWithExactly(updatedUser));
});

test('should get user by id', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });

  const user2 = await t.context.user.get(user.id);

  t.not(user2, null);
  t.is(user2!.id, user.id);
});

test('should get public user by id', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });

  const publicUser = await t.context.user.getPublicUser(user.id);

  t.not(publicUser, null);
  t.is(publicUser!.id, user.id);
  t.true(!('password' in publicUser!));
});

test('should get public user by email', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });

  const publicUser = await t.context.user.getPublicUserByEmail(user.email);

  t.not(publicUser, null);
  t.is(publicUser!.id, user.id);
  t.true(!('password' in publicUser!));
});

test('should get user by email', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });

  const user2 = await t.context.user.getUserByEmail(user.email);

  t.not(user2, null);
  t.is(user2!.id, user.id);
});

test('should ignore case when getting user by email', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });

  const user2 = await t.context.user.getUserByEmail('TEST@affine.pro');

  t.not(user2, null);
  t.is(user2!.id, user.id);
});

test('should return null for non existing user', async t => {
  const user = await t.context.user.getUserByEmail('test@affine.pro');

  t.is(user, null);
});

test('should fulfill user', async t => {
  let user = await t.context.user.create({
    email: 'test@affine.pro',
    registered: false,
  });

  t.is(user.registered, false);
  t.is(user.emailVerifiedAt, null);

  user = await t.context.user.fulfill(user.email);

  t.is(user.registered, true);
  t.not(user.emailVerifiedAt, null);

  const user2 = await t.context.user.fulfill('test2@affine.pro');

  t.is(user2.registered, true);
  t.not(user2.emailVerifiedAt, null);
});

test('should trigger user.updated event when fulfilling user', async t => {
  const event = t.context.module.get(EventEmitter2);
  const createSpy = Sinon.spy();
  const updateSpy = Sinon.spy();
  event.on('user.created', createSpy);
  event.on('user.updated', updateSpy);

  const user2 = await t.context.user.fulfill('test2@affine.pro');

  t.true(createSpy.calledOnceWithExactly(user2));

  let user = await t.context.user.create({
    email: 'test@affine.pro',
    registered: false,
  });

  user = await t.context.user.fulfill(user.email);

  t.true(updateSpy.calledOnceWithExactly(user));
});

test('should delete user', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });

  await t.context.user.delete(user.id);

  const user2 = await t.context.user.get(user.id);

  t.is(user2, null);
});

test('should trigger user.deleted event', async t => {
  const event = t.context.module.get(EventEmitter2);
  const spy = Sinon.spy();
  event.on('user.deleted', spy);

  const user = await t.context.user.create({
    email: 'test@affine.pro',
    workspacePermissions: {
      create: {
        workspace: {
          create: {
            id: 'test-workspace',
            public: false,
          },
        },
        type: Permission.Owner,
        status: WorkspaceMemberStatus.Accepted,
      },
    },
  });

  await t.context.user.delete(user.id);

  t.true(
    spy.calledOnceWithExactly({ ...user, ownedWorkspaces: ['test-workspace'] })
  );
});

test('should paginate users', async t => {
  const db = t.context.module.get(PrismaClient);
  const now = Date.now();
  await Promise.all(
    Array.from({ length: 100 }).map((_, i) =>
      db.user.create({
        data: {
          name: `test${i}`,
          email: `test${i}@affine.pro`,
          createdAt: new Date(now + i),
        },
      })
    )
  );

  const users = await t.context.user.pagination(0, 10);
  t.is(users.length, 10);
  t.deepEqual(
    users.map(user => user.email),
    Array.from({ length: 10 }).map((_, i) => `test${i}@affine.pro`)
  );
});
