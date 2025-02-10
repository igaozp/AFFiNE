import { PrismaClient, WorkspaceMemberStatus } from '@prisma/client';
import ava, { TestFn } from 'ava';
import Sinon from 'sinon';

import { Config, EventBus } from '../../base';
import { WorkspaceRole } from '../../core/permission';
import { UserModel } from '../../models/user';
import { WorkspaceModel } from '../../models/workspace';
import { createTestingModule, type TestingModule } from '../utils';

interface Context {
  config: Config;
  module: TestingModule;
  db: PrismaClient;
  user: UserModel;
  workspace: WorkspaceModel;
}

const test = ava as TestFn<Context>;

test.before(async t => {
  const module = await createTestingModule();
  t.context.user = module.get(UserModel);
  t.context.workspace = module.get(WorkspaceModel);
  t.context.db = module.get(PrismaClient);
  t.context.config = module.get(Config);
  t.context.module = module;
});

test.beforeEach(async t => {
  await t.context.module.initTestingDB();
});

test.after(async t => {
  await t.context.module.close();
});

test('should create a new workspace, default to private', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  t.truthy(workspace.id);
  t.truthy(workspace.createdAt);
  t.is(workspace.public, false);

  const workspace1 = await t.context.workspace.get(workspace.id);
  t.deepEqual(workspace, workspace1);
});

test('should get null for non-exist workspace', async t => {
  const workspace = await t.context.workspace.get('non-exist');
  t.is(workspace, null);
});

test('should update workspace', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const data = {
    public: true,
    enableAi: true,
    enableUrlPreview: true,
  };
  await t.context.workspace.update(workspace.id, data);
  const workspace1 = await t.context.workspace.get(workspace.id);
  t.deepEqual(workspace1, {
    ...workspace,
    ...data,
  });
});

test('should delete workspace', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  await t.context.workspace.delete(workspace.id);
  const workspace1 = await t.context.workspace.get(workspace.id);
  t.is(workspace1, null);
  // delete again should not throw
  await t.context.workspace.delete(workspace.id);
});

test('should workspace owner has all permissions', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  let allowed = await t.context.workspace.isMember(
    workspace.id,
    user.id,
    WorkspaceRole.Owner
  );
  t.is(allowed, true);
  allowed = await t.context.workspace.isMember(
    workspace.id,
    user.id,
    WorkspaceRole.Admin
  );
  t.is(allowed, true);
  allowed = await t.context.workspace.isMember(
    workspace.id,
    user.id,
    WorkspaceRole.Collaborator
  );
  t.is(allowed, true);
  allowed = await t.context.workspace.isMember(
    workspace.id,
    user.id,
    WorkspaceRole.Collaborator
  );
  t.is(allowed, true);
});

test('should workspace admin has all permissions except owner', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const otherUser = await t.context.user.create({
    email: 'test2@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  await t.context.db.workspaceUserPermission.create({
    data: {
      workspaceId: workspace.id,
      userId: otherUser.id,
      type: WorkspaceRole.Admin,
      status: WorkspaceMemberStatus.Accepted,
    },
  });
  let allowed = await t.context.workspace.isMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Owner
  );
  t.is(allowed, false);
  allowed = await t.context.workspace.isMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Admin
  );
  t.is(allowed, true);
  allowed = await t.context.workspace.isMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator
  );
  t.is(allowed, true);
  allowed = await t.context.workspace.isMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator
  );
  t.is(allowed, true);
});

test('should workspace write has write and read permissions', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const otherUser = await t.context.user.create({
    email: 'test2@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  await t.context.db.workspaceUserPermission.create({
    data: {
      workspaceId: workspace.id,
      userId: otherUser.id,
      type: WorkspaceRole.Collaborator,
      status: WorkspaceMemberStatus.Accepted,
    },
  });
  let allowed = await t.context.workspace.isMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Owner
  );
  t.is(allowed, false);
  allowed = await t.context.workspace.isMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Admin
  );
  t.is(allowed, false);
  allowed = await t.context.workspace.isMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator
  );
  t.is(allowed, true);
  allowed = await t.context.workspace.isMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator
  );
  t.is(allowed, true);
});

test('should workspace read has read permission only', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const otherUser = await t.context.user.create({
    email: 'test2@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  await t.context.db.workspaceUserPermission.create({
    data: {
      workspaceId: workspace.id,
      userId: otherUser.id,
      type: WorkspaceRole.Collaborator,
      status: WorkspaceMemberStatus.Accepted,
    },
  });
  let allowed = await t.context.workspace.isMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Owner
  );
  t.is(allowed, false);
  allowed = await t.context.workspace.isMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Admin
  );
  t.is(allowed, false);
  allowed = await t.context.workspace.isMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator
  );
  t.is(allowed, true);
});

test('should user not in workspace has no permissions', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const otherUser = await t.context.user.create({
    email: 'test2@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  let allowed = await t.context.workspace.isMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Owner
  );
  t.is(allowed, false);
  allowed = await t.context.workspace.isMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Admin
  );
  t.is(allowed, false);
  allowed = await t.context.workspace.isMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator
  );
  t.is(allowed, false);
  allowed = await t.context.workspace.isMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator
  );
  t.is(allowed, false);
});

test('should find user accessible workspaces', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const otherUser = await t.context.user.create({
    email: 'test2@affine.pro',
  });
  const workspace1 = await t.context.workspace.create(user.id);
  const workspace2 = await t.context.workspace.create(user.id);
  await t.context.workspace.create(otherUser.id);
  const workspaces = await t.context.workspace.findAccessibleWorkspaces(
    user.id
  );
  t.is(workspaces.length, 2);
  t.deepEqual(
    workspaces.map(w => w.workspace.id),
    [workspace1.id, workspace2.id]
  );
});

test('should grant member with read permission and Pending status by default', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const otherUser = await t.context.user.create({
    email: 'test2@affine.pro',
  });

  const event = t.context.module.get(EventBus);
  const updatedSpy = Sinon.spy();
  event.on('workspace.members.updated', updatedSpy);
  const member1 = await t.context.workspace.grantMember(
    workspace.id,
    otherUser.id
  );
  t.is(member1.workspaceId, workspace.id);
  t.is(member1.userId, otherUser.id);
  t.is(member1.type, WorkspaceRole.Collaborator);
  t.is(member1.status, WorkspaceMemberStatus.Pending);

  // grant again should do nothing
  const member2 = await t.context.workspace.grantMember(
    workspace.id,
    otherUser.id
  );
  t.deepEqual(member1, member2);
  t.true(
    updatedSpy.calledOnceWith({
      workspaceId: workspace.id,
      count: 2,
    })
  );
});

test('should grant Pending status member to Accepted status', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const otherUser = await t.context.user.create({
    email: 'test2@affine.pro',
  });
  const member1 = await t.context.workspace.grantMember(
    workspace.id,
    otherUser.id
  );
  t.is(member1.workspaceId, workspace.id);
  t.is(member1.userId, otherUser.id);
  t.is(member1.type, WorkspaceRole.Collaborator);
  t.is(member1.status, WorkspaceMemberStatus.Pending);

  const member2 = await t.context.workspace.grantMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.Accepted
  );
  t.is(member2.workspaceId, workspace.id);
  t.is(member2.userId, otherUser.id);
  t.is(member2.type, WorkspaceRole.Collaborator);
  t.is(member2.status, WorkspaceMemberStatus.Accepted);
});

test('should grant new owner and change exists owner to admin', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const otherUser = await t.context.user.create({
    email: 'test2@affine.pro',
  });
  const member1 = await t.context.workspace.grantMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.Accepted
  );
  t.is(member1.workspaceId, workspace.id);
  t.is(member1.userId, otherUser.id);
  t.is(member1.type, WorkspaceRole.Collaborator);
  t.is(member1.status, WorkspaceMemberStatus.Accepted);

  const member2 = await t.context.workspace.grantMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Owner,
    WorkspaceMemberStatus.Accepted
  );
  t.is(member2.workspaceId, workspace.id);
  t.is(member2.userId, otherUser.id);
  t.is(member2.type, WorkspaceRole.Owner);
  t.is(member2.status, WorkspaceMemberStatus.Accepted);
  // check old owner
  const owner = await t.context.workspace.getMember(workspace.id, user.id);
  t.is(owner!.type, WorkspaceRole.Admin);
  t.is(owner!.status, WorkspaceMemberStatus.Accepted);
});

test('should grant write permission on exists member', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const otherUser = await t.context.user.create({
    email: 'test2@affine.pro',
  });
  const member1 = await t.context.workspace.grantMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.Accepted
  );
  t.is(member1.workspaceId, workspace.id);
  t.is(member1.userId, otherUser.id);
  t.is(member1.type, WorkspaceRole.Collaborator);
  t.is(member1.status, WorkspaceMemberStatus.Accepted);

  const member2 = await t.context.workspace.grantMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.Accepted
  );
  t.is(member2.workspaceId, workspace.id);
  t.is(member2.userId, otherUser.id);
  t.is(member2.type, WorkspaceRole.Collaborator);
  t.is(member2.status, WorkspaceMemberStatus.Accepted);
});

test('should grant UnderReview status member to Accepted status', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const otherUser = await t.context.user.create({
    email: 'test2@affine.pro',
  });
  const member1 = await t.context.workspace.grantMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.UnderReview
  );
  t.is(member1.workspaceId, workspace.id);
  t.is(member1.userId, otherUser.id);
  t.is(member1.type, WorkspaceRole.Collaborator);
  t.is(member1.status, WorkspaceMemberStatus.UnderReview);

  const member2 = await t.context.workspace.grantMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.Accepted
  );
  t.is(member2.workspaceId, workspace.id);
  t.is(member2.userId, otherUser.id);
  t.is(member2.type, WorkspaceRole.Collaborator);
  t.is(member2.status, WorkspaceMemberStatus.Accepted);
});

test('should grant NeedMoreSeat status member to Pending status', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const otherUser = await t.context.user.create({
    email: 'test2@affine.pro',
  });
  const member1 = await t.context.workspace.grantMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.NeedMoreSeat
  );
  t.is(member1.workspaceId, workspace.id);
  t.is(member1.userId, otherUser.id);
  t.is(member1.type, WorkspaceRole.Collaborator);
  t.is(member1.status, WorkspaceMemberStatus.NeedMoreSeat);

  const member2 = await t.context.workspace.grantMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.Pending
  );
  t.is(member2.workspaceId, workspace.id);
  t.is(member2.userId, otherUser.id);
  t.is(member2.type, WorkspaceRole.Collaborator);
  t.is(member2.status, WorkspaceMemberStatus.Pending);
});

test('should grant NeedMoreSeatAndReview status member to UnderReview status', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const otherUser = await t.context.user.create({
    email: 'test2@affine.pro',
  });
  const member1 = await t.context.workspace.grantMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.NeedMoreSeatAndReview
  );
  t.is(member1.workspaceId, workspace.id);
  t.is(member1.userId, otherUser.id);
  t.is(member1.type, WorkspaceRole.Collaborator);
  t.is(member1.status, WorkspaceMemberStatus.NeedMoreSeatAndReview);

  const member2 = await t.context.workspace.grantMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.UnderReview
  );
  t.is(member2.workspaceId, workspace.id);
  t.is(member2.userId, otherUser.id);
  t.is(member2.type, WorkspaceRole.Collaborator);
  t.is(member2.status, WorkspaceMemberStatus.UnderReview);
});

test('should grant Pending status member to write permission and Accepted status', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const otherUser = await t.context.user.create({
    email: 'test2@affine.pro',
  });
  const member1 = await t.context.workspace.grantMember(
    workspace.id,
    otherUser.id
  );
  t.is(member1.workspaceId, workspace.id);
  t.is(member1.userId, otherUser.id);
  t.is(member1.type, WorkspaceRole.Collaborator);
  t.is(member1.status, WorkspaceMemberStatus.Pending);

  const member2 = await t.context.workspace.grantMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.Accepted
  );
  t.is(member2.workspaceId, workspace.id);
  t.is(member2.userId, otherUser.id);
  // TODO(fengmk2): fix this
  // t.is(member2.type, WorkspaceRole.Collaborator);
  t.is(member2.status, WorkspaceMemberStatus.Accepted);
});

test('should grant no thing on invalid status', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const otherUser = await t.context.user.create({
    email: 'test2@affine.pro',
  });
  const member1 = await t.context.workspace.grantMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.NeedMoreSeat
  );
  t.is(member1.workspaceId, workspace.id);
  t.is(member1.userId, otherUser.id);
  t.is(member1.type, WorkspaceRole.Collaborator);
  t.is(member1.status, WorkspaceMemberStatus.NeedMoreSeat);

  const member2 = await t.context.workspace.grantMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.Accepted
  );
  t.is(member2.workspaceId, workspace.id);
  t.is(member2.userId, otherUser.id);
  t.is(member2.type, WorkspaceRole.Collaborator);
  t.is(member2.status, WorkspaceMemberStatus.NeedMoreSeat);
});

test('should get the accepted status workspace member', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const otherUser = await t.context.user.create({
    email: 'test2@affine.pro',
  });
  await t.context.workspace.grantMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.Accepted
  );
  const member = await t.context.workspace.getMember(
    workspace.id,
    otherUser.id
  );
  t.is(member!.workspaceId, workspace.id);
  t.is(member!.userId, otherUser.id);
  t.is(member!.type, WorkspaceRole.Collaborator);
  t.is(member!.status, WorkspaceMemberStatus.Accepted);
});

test('should get any status workspace member, including pending and accepted', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const otherUser = await t.context.user.create({
    email: 'test2@affine.pro',
  });
  await t.context.workspace.grantMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.Pending
  );
  const member = await t.context.workspace.getMemberInAnyStatus(
    workspace.id,
    otherUser.id
  );
  t.is(member!.workspaceId, workspace.id);
  t.is(member!.userId, otherUser.id);
  t.is(member!.type, WorkspaceRole.Collaborator);
  t.is(member!.status, WorkspaceMemberStatus.Pending);
});

test('should get workspace owner by workspace id', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const owner = await t.context.workspace.getOwner(workspace.id);
  t.is(owner!.workspaceId, workspace.id);
  t.is(owner!.userId, user.id);
  t.is(owner!.type, WorkspaceRole.Owner);
  t.is(owner!.status, WorkspaceMemberStatus.Accepted);
  t.truthy(owner!.user);
  t.deepEqual(owner!.user, user);
});

test('should find workspace admin by workspace id', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const otherUser1 = await t.context.user.create({
    email: 'tes1@affine.pro',
  });
  const otherUser2 = await t.context.user.create({
    email: 'test2@affine.pro',
  });
  const otherUser3 = await t.context.user.create({
    email: 'test3@affine.pro',
  });
  await t.context.workspace.grantMember(
    workspace.id,
    otherUser1.id,
    WorkspaceRole.Admin,
    WorkspaceMemberStatus.Accepted
  );
  await t.context.workspace.grantMember(
    workspace.id,
    otherUser2.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.Accepted
  );
  // pending member should not be admin
  await t.context.workspace.grantMember(
    workspace.id,
    otherUser3.id,
    WorkspaceRole.Admin,
    WorkspaceMemberStatus.Pending
  );
  const members = await t.context.workspace.findAdmins(workspace.id);
  t.is(members.length, 1);
  t.is(members[0].workspaceId, workspace.id);
  t.is(members[0].userId, otherUser1.id);
  t.is(members[0].type, WorkspaceRole.Admin);
  t.is(members[0].status, WorkspaceMemberStatus.Accepted);
});

test('should find workspace ids by owner id', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace1 = await t.context.workspace.create(user.id);
  const workspace2 = await t.context.workspace.create(user.id);
  const otherUser = await t.context.user.create({
    email: 'tes1@affine.pro',
  });
  await t.context.workspace.create(otherUser.id);
  const workspaceIds = await t.context.workspace.findOwnedIds(user.id);
  t.deepEqual(workspaceIds, [workspace1.id, workspace2.id]);
});

test('should the workspace member total count, including pending and accepted', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const otherUser1 = await t.context.user.create({
    email: 'tes1@affine.pro',
  });
  const otherUser2 = await t.context.user.create({
    email: 'test2@affine.pro',
  });
  await t.context.workspace.grantMember(
    workspace.id,
    otherUser1.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.Pending
  );
  await t.context.workspace.grantMember(
    workspace.id,
    otherUser2.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.Accepted
  );
  const count = await t.context.workspace.getMemberTotalCount(workspace.id);
  t.is(count, 3);
});

test('should the workspace member used count, only count the accepted member', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const otherUser1 = await t.context.user.create({
    email: 'tes1@affine.pro',
  });
  const otherUser2 = await t.context.user.create({
    email: 'test2@affine.pro',
  });
  await t.context.workspace.grantMember(
    workspace.id,
    otherUser1.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.Pending
  );
  await t.context.workspace.grantMember(
    workspace.id,
    otherUser2.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.Accepted
  );
  const count = await t.context.workspace.getMemberUsedCount(workspace.id);
  t.is(count, 2);
});

test('should accept workspace member invitation', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const otherUser1 = await t.context.user.create({
    email: 'test1@affine.pro',
  });
  const member = await t.context.workspace.grantMember(
    workspace.id,
    otherUser1.id
  );
  t.is(member.status, WorkspaceMemberStatus.Pending);
  let success = await t.context.workspace.acceptMemberInvitation(
    member.id,
    workspace.id
  );
  t.is(success, true);
  const member1 = await t.context.workspace.getMemberInAnyStatus(
    workspace.id,
    otherUser1.id
  );
  t.is(member1!.status, WorkspaceMemberStatus.Accepted);
  // accept again should do nothing
  success = await t.context.workspace.acceptMemberInvitation(
    member.id,
    workspace.id
  );
  t.is(success, false);
  const member2 = await t.context.workspace.getMember(
    workspace.id,
    otherUser1.id
  );
  t.deepEqual(member1, member2);

  // accept with UnderReview status
  const otherUser2 = await t.context.user.create({
    email: 'test2@affine.pro',
  });
  const member3 = await t.context.workspace.grantMember(
    workspace.id,
    otherUser2.id
  );
  t.is(member3.status, WorkspaceMemberStatus.Pending);
  success = await t.context.workspace.acceptMemberInvitation(
    member3.id,
    workspace.id,
    WorkspaceMemberStatus.UnderReview
  );
  t.is(success, true);
  const member4 = await t.context.workspace.getMember(
    workspace.id,
    otherUser2.id
  );
  t.is(member4!.status, WorkspaceMemberStatus.UnderReview);
  // accept again should do nothing
  success = await t.context.workspace.acceptMemberInvitation(
    member3.id,
    workspace.id,
    WorkspaceMemberStatus.UnderReview
  );
  t.is(success, false);
});

test('should delete workspace member in Pending, Accepted status', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const otherUser = await t.context.user.create({
    email: 'test1@affine.pro',
  });
  const member = await t.context.workspace.grantMember(
    workspace.id,
    otherUser.id
  );
  t.is(member.status, WorkspaceMemberStatus.Pending);

  const event = t.context.module.get(EventBus);
  const updatedSpy = Sinon.spy();
  event.on('workspace.members.updated', updatedSpy);
  let success = await t.context.workspace.deleteMember(
    workspace.id,
    otherUser.id
  );
  t.is(success, true);
  const member1 = await t.context.workspace.getMember(
    workspace.id,
    otherUser.id
  );
  t.is(member1, null);
  t.true(
    updatedSpy.calledOnceWith({
      workspaceId: workspace.id,
      count: 1,
    })
  );

  // delete again should do nothing
  success = await t.context.workspace.deleteMember(workspace.id, otherUser.id);
  t.is(success, false);

  const member2 = await t.context.workspace.grantMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.Accepted
  );
  t.is(member2.status, WorkspaceMemberStatus.Accepted);
  success = await t.context.workspace.deleteMember(workspace.id, otherUser.id);
  t.is(success, true);
});

test('should trigger workspace.members.requestDeclined event when delete workspace member in UnderReview status', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const otherUser = await t.context.user.create({
    email: 'test1@affine.pro',
  });
  const member = await t.context.workspace.grantMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.UnderReview
  );
  t.is(member.status, WorkspaceMemberStatus.UnderReview);

  const event = t.context.module.get(EventBus);
  const updatedSpy = Sinon.spy();
  const requestDeclinedSpy = Sinon.spy();
  event.on('workspace.members.updated', updatedSpy);
  event.on('workspace.members.requestDeclined', requestDeclinedSpy);
  let success = await t.context.workspace.deleteMember(
    workspace.id,
    otherUser.id
  );
  t.is(success, true);
  const member1 = await t.context.workspace.getMember(
    workspace.id,
    otherUser.id
  );
  t.is(member1, null);
  t.true(
    updatedSpy.calledOnceWith({
      workspaceId: workspace.id,
      count: 1,
    })
  );
  t.true(
    requestDeclinedSpy.calledOnceWith({
      workspaceId: workspace.id,
      userId: otherUser.id,
    })
  );
});

test('should trigger workspace.members.requestDeclined event when delete workspace member in NeedMoreSeatAndReview status', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const otherUser = await t.context.user.create({
    email: 'test1@affine.pro',
  });
  const member = await t.context.workspace.grantMember(
    workspace.id,
    otherUser.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.NeedMoreSeatAndReview
  );
  t.is(member.status, WorkspaceMemberStatus.NeedMoreSeatAndReview);

  const event = t.context.module.get(EventBus);
  const updatedSpy = Sinon.spy();
  const requestDeclinedSpy = Sinon.spy();
  event.on('workspace.members.updated', updatedSpy);
  event.on('workspace.members.requestDeclined', requestDeclinedSpy);
  let success = await t.context.workspace.deleteMember(
    workspace.id,
    otherUser.id
  );
  t.is(success, true);
  const member1 = await t.context.workspace.getMember(
    workspace.id,
    otherUser.id
  );
  t.is(member1, null);
  t.true(
    updatedSpy.calledOnceWith({
      workspaceId: workspace.id,
      count: 1,
    })
  );
  t.true(
    requestDeclinedSpy.calledOnceWith({
      workspaceId: workspace.id,
      userId: otherUser.id,
    })
  );
});

test('should refresh member seat status', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const otherUser1 = await t.context.user.create({
    email: 'test1@affine.pro',
  });
  const otherUser2 = await t.context.user.create({
    email: 'test2@affine.pro',
  });
  const otherUser3 = await t.context.user.create({
    email: 'test3@affine.pro',
  });
  await t.context.workspace.grantMember(
    workspace.id,
    otherUser1.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.NeedMoreSeatAndReview
  );
  await t.context.workspace.grantMember(
    workspace.id,
    otherUser2.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.Pending
  );
  await t.context.workspace.grantMember(
    workspace.id,
    otherUser3.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.NeedMoreSeat
  );
  let count = await t.context.db.workspaceUserPermission.count({
    where: {
      workspaceId: workspace.id,
      status: WorkspaceMemberStatus.Pending,
    },
  });
  t.is(count, 1);
  // available not enough
  await t.context.workspace.refreshMemberSeatStatus(workspace.id, 1);
  count = await t.context.db.workspaceUserPermission.count({
    where: {
      workspaceId: workspace.id,
      status: WorkspaceMemberStatus.Pending,
    },
  });
  t.is(count, 1);

  // available enough
  await t.context.workspace.refreshMemberSeatStatus(workspace.id, 3);
  // pending member should be 2 and under review member should be 1
  count = await t.context.db.workspaceUserPermission.count({
    where: {
      workspaceId: workspace.id,
      status: WorkspaceMemberStatus.Pending,
    },
  });
  t.is(count, 2);
  count = await t.context.db.workspaceUserPermission.count({
    where: {
      workspaceId: workspace.id,
      status: WorkspaceMemberStatus.UnderReview,
    },
  });
  t.is(count, 1);

  // again should do nothing
  await t.context.workspace.refreshMemberSeatStatus(workspace.id, 3);
  count = await t.context.db.workspaceUserPermission.count({
    where: {
      workspaceId: workspace.id,
      status: WorkspaceMemberStatus.Pending,
    },
  });
  t.is(count, 2);
});

test('should find the workspace members order by type:desc and createdAt:asc', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  for (let i = 0; i < 10; i++) {
    const otherUser = await t.context.user.create({
      email: `test${i}@affine.pro`,
    });
    await t.context.workspace.grantMember(
      workspace.id,
      otherUser.id,
      WorkspaceRole.Collaborator,
      WorkspaceMemberStatus.Accepted
    );
  }
  let members = await t.context.workspace.findMembers(workspace.id);
  t.is(members.length, 8);
  t.is(members[0].type, WorkspaceRole.Owner);
  t.is(members[0].status, WorkspaceMemberStatus.Accepted);
  for (let i = 1; i < 8; i++) {
    t.is(members[i].type, WorkspaceRole.Collaborator);
    t.is(members[i].status, WorkspaceMemberStatus.Accepted);
  }
  members = await t.context.workspace.findMembers(workspace.id, { take: 100 });
  t.is(members.length, 11);
  t.is(members[0].type, WorkspaceRole.Owner);
  t.is(members[0].status, WorkspaceMemberStatus.Accepted);
  for (let i = 1; i < 11; i++) {
    t.is(members[i].type, WorkspaceRole.Collaborator);
    t.is(members[i].status, WorkspaceMemberStatus.Accepted);
  }
  // skip should work
  members = await t.context.workspace.findMembers(workspace.id, { skip: 5 });
  t.is(members.length, 6);
  t.is(members[0].type, WorkspaceRole.Collaborator);
});

test('should get the workspace member invitation', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const otherUser1 = await t.context.user.create({
    email: 'test2@affine.pro',
  });
  const invitation = await t.context.workspace.grantMember(
    workspace.id,
    otherUser1.id
  );
  t.is(invitation.status, WorkspaceMemberStatus.Pending);
  const invitation1 = await t.context.workspace.getMemberInvitation(
    invitation.id
  );
  t.deepEqual(invitation, invitation1);
});
