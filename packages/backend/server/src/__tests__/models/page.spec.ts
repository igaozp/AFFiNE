import { PrismaClient } from '@prisma/client';
import ava, { TestFn } from 'ava';

import { Config } from '../../base/config';
import { WorkspaceRole } from '../../core/permission';
import { PublicPageMode } from '../../models/common';
import { PageModel } from '../../models/page';
import { type User, UserModel } from '../../models/user';
import { type Workspace, WorkspaceModel } from '../../models/workspace';
import { createTestingModule, type TestingModule } from '../utils';

interface Context {
  config: Config;
  module: TestingModule;
  db: PrismaClient;
  user: UserModel;
  workspace: WorkspaceModel;
  page: PageModel;
}

const test = ava as TestFn<Context>;

test.before(async t => {
  const module = await createTestingModule();

  t.context.user = module.get(UserModel);
  t.context.workspace = module.get(WorkspaceModel);
  t.context.page = module.get(PageModel);
  t.context.db = module.get(PrismaClient);
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

test('should create page with default mode and public false', async t => {
  const page = await t.context.page.upsert(workspace.id, 'page1');
  t.is(page.workspaceId, workspace.id);
  t.is(page.docId, 'page1');
  t.is(page.mode, PublicPageMode.Page);
  t.is(page.public, false);
});

test('should update page', async t => {
  const page = await t.context.page.upsert(workspace.id, 'page1');
  const data = {
    mode: PublicPageMode.Edgeless,
    public: true,
  };
  await t.context.page.upsert(workspace.id, 'page1', data);
  const page1 = await t.context.page.get(workspace.id, 'page1');
  t.deepEqual(page1, {
    ...page,
    ...data,
  });
});

test('should get null when page not exists', async t => {
  const page = await t.context.page.get(workspace.id, 'page1');
  t.is(page, null);
});

test('should get page by id and public flag', async t => {
  await t.context.page.upsert(workspace.id, 'page1');
  await t.context.page.upsert(workspace.id, 'page2', {
    public: true,
  });
  let page1 = await t.context.page.get(workspace.id, 'page1');
  t.is(page1!.public, false);
  page1 = await t.context.page.get(workspace.id, 'page1', true);
  t.is(page1, null);
  let page2 = await t.context.page.get(workspace.id, 'page2', true);
  t.is(page2!.public, true);
  page2 = await t.context.page.get(workspace.id, 'page2', false);
  t.is(page2, null);
});

test('should get public page count', async t => {
  await t.context.page.upsert(workspace.id, 'page1', {
    public: true,
  });
  await t.context.page.upsert(workspace.id, 'page2', {
    public: true,
  });
  await t.context.page.upsert(workspace.id, 'page3');
  const count = await t.context.page.getPublicsCount(workspace.id);
  t.is(count, 2);
});

test('should get public pages of a workspace', async t => {
  await t.context.page.upsert(workspace.id, 'page1', {
    public: true,
  });
  await t.context.page.upsert(workspace.id, 'page2', {
    public: true,
  });
  await t.context.page.upsert(workspace.id, 'page3');
  const pages = await t.context.page.findPublics(workspace.id);
  t.is(pages.length, 2);
  t.deepEqual(pages.map(p => p.docId).sort(), ['page1', 'page2']);
});

test('should grant a member to access a page', async t => {
  await t.context.page.upsert(workspace.id, 'page1', {
    public: true,
  });
  const member = await t.context.user.create({
    email: 'test1@affine.pro',
  });
  await t.context.page.grantMember(workspace.id, 'page1', member.id);
  let hasAccess = await t.context.page.isMember(
    workspace.id,
    'page1',
    member.id
  );
  t.true(hasAccess);
  hasAccess = await t.context.page.isMember(
    workspace.id,
    'page1',
    user.id,
    WorkspaceRole.Collaborator
  );
  t.false(hasAccess);
  // grant write permission
  await t.context.page.grantMember(
    workspace.id,
    'page1',
    user.id,
    WorkspaceRole.Collaborator
  );
  hasAccess = await t.context.page.isMember(
    workspace.id,
    'page1',
    user.id,
    WorkspaceRole.Collaborator
  );
  t.true(hasAccess);
  hasAccess = await t.context.page.isMember(
    workspace.id,
    'page1',
    user.id,
    WorkspaceRole.Collaborator
  );
  t.true(hasAccess);
  // delete member
  const count = await t.context.page.deleteMember(
    workspace.id,
    'page1',
    user.id
  );
  t.is(count, 1);
  hasAccess = await t.context.page.isMember(workspace.id, 'page1', user.id);
  t.false(hasAccess);
});

test('should change the page owner', async t => {
  await t.context.page.upsert(workspace.id, 'page1', {
    public: true,
  });
  await t.context.page.grantMember(
    workspace.id,
    'page1',
    user.id,
    WorkspaceRole.Owner
  );
  t.true(
    await t.context.page.isMember(
      workspace.id,
      'page1',
      user.id,
      WorkspaceRole.Owner
    )
  );

  // change owner
  const otherUser = await t.context.user.create({
    email: 'test1@affine.pro',
  });
  await t.context.page.grantMember(
    workspace.id,
    'page1',
    otherUser.id,
    WorkspaceRole.Owner
  );
  t.true(
    await t.context.page.isMember(
      workspace.id,
      'page1',
      otherUser.id,
      WorkspaceRole.Owner
    )
  );
  t.false(
    await t.context.page.isMember(
      workspace.id,
      'page1',
      user.id,
      WorkspaceRole.Owner
    )
  );
});

test('should not delete owner from page', async t => {
  await t.context.page.upsert(workspace.id, 'page1', {
    public: true,
  });
  await t.context.page.grantMember(
    workspace.id,
    'page1',
    user.id,
    WorkspaceRole.Owner
  );
  const count = await t.context.page.deleteMember(
    workspace.id,
    'page1',
    user.id
  );
  t.is(count, 0);
});
