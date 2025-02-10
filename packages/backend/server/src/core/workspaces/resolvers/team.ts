import { Logger } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { PrismaClient, WorkspaceMemberStatus } from '@prisma/client';
import { nanoid } from 'nanoid';

import {
  ActionForbiddenOnNonTeamWorkspace,
  Cache,
  EventBus,
  MemberNotFoundInSpace,
  OnEvent,
  RequestMutex,
  TooManyRequest,
  URLHelper,
  UserFriendlyError,
} from '../../../base';
import { Models } from '../../../models';
import { CurrentUser } from '../../auth';
import { PermissionService, WorkspaceRole } from '../../permission';
import { QuotaService } from '../../quota';
import {
  InviteLink,
  InviteResult,
  WorkspaceInviteLinkExpireTime,
  WorkspaceType,
} from '../types';
import { WorkspaceService } from './service';

/**
 * Workspace team resolver
 * Public apis rate limit: 10 req/m
 * Other rate limit: 120 req/m
 */
@Resolver(() => WorkspaceType)
export class TeamWorkspaceResolver {
  private readonly logger = new Logger(TeamWorkspaceResolver.name);

  constructor(
    private readonly cache: Cache,
    private readonly event: EventBus,
    private readonly url: URLHelper,
    private readonly prisma: PrismaClient,
    private readonly permissions: PermissionService,
    private readonly models: Models,
    private readonly quota: QuotaService,
    private readonly mutex: RequestMutex,
    private readonly workspaceService: WorkspaceService
  ) {}

  @ResolveField(() => Boolean, {
    name: 'team',
    description: 'if workspace is team workspace',
    complexity: 2,
  })
  team(@Parent() workspace: WorkspaceType) {
    return this.workspaceService.isTeamWorkspace(workspace.id);
  }

  @Mutation(() => [InviteResult])
  async inviteBatch(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args({ name: 'emails', type: () => [String] }) emails: string[],
    @Args('sendInviteMail', { nullable: true }) sendInviteMail: boolean
  ) {
    await this.permissions.checkWorkspace(
      workspaceId,
      user.id,
      WorkspaceRole.Admin
    );

    if (emails.length > 512) {
      return new TooManyRequest();
    }

    // lock to prevent concurrent invite
    const lockFlag = `invite:${workspaceId}`;
    await using lock = await this.mutex.acquire(lockFlag);
    if (!lock) {
      return new TooManyRequest();
    }

    const quota = await this.quota.getWorkspaceSeatQuota(workspaceId);

    const results = [];
    for (const [idx, email] of emails.entries()) {
      const ret: InviteResult = { email, sentSuccess: false, inviteId: null };
      try {
        let target = await this.models.user.getUserByEmail(email);
        if (target) {
          const originRecord =
            await this.prisma.workspaceUserPermission.findFirst({
              where: {
                workspaceId,
                userId: target.id,
              },
            });
          // only invite if the user is not already in the workspace
          if (originRecord) continue;
        } else {
          target = await this.models.user.create({
            email,
            registered: false,
          });
        }
        const needMoreSeat = quota.memberCount + idx + 1 > quota.memberLimit;

        ret.inviteId = await this.permissions.grant(
          workspaceId,
          target.id,
          WorkspaceRole.Collaborator,
          needMoreSeat
            ? WorkspaceMemberStatus.NeedMoreSeat
            : WorkspaceMemberStatus.Pending
        );
        // NOTE: we always send email even seat not enough
        // because at this moment we cannot know whether the seat increase charge was successful
        // after user click the invite link, we can check again and reject if charge failed
        if (sendInviteMail) {
          try {
            await this.workspaceService.sendInviteEmail(ret.inviteId);
            ret.sentSuccess = true;
          } catch (e) {
            this.logger.warn(
              `failed to send ${workspaceId} invite email to ${email}: ${e}`
            );
          }
        }
      } catch (e) {
        this.logger.error('failed to invite user', e);
      }
      results.push(ret);
    }

    const memberCount = quota.memberCount + results.length;
    if (memberCount > quota.memberLimit) {
      this.event.emit('workspace.members.updated', {
        workspaceId,
        count: memberCount,
      });
    }

    return results;
  }

  @ResolveField(() => InviteLink, {
    description: 'invite link for workspace',
    nullable: true,
  })
  async inviteLink(
    @Parent() workspace: WorkspaceType,
    @CurrentUser() user: CurrentUser
  ) {
    await this.permissions.checkWorkspace(
      workspace.id,
      user.id,
      WorkspaceRole.Admin
    );

    const cacheId = `workspace:inviteLink:${workspace.id}`;
    const id = await this.cache.get<{ inviteId: string }>(cacheId);
    if (id) {
      const expireTime = await this.cache.ttl(cacheId);
      if (Number.isSafeInteger(expireTime)) {
        return {
          link: this.url.link(`/invite/${id.inviteId}`),
          expireTime: new Date(Date.now() + expireTime),
        };
      }
    }
    return null;
  }

  @Mutation(() => InviteLink)
  async createInviteLink(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('expireTime', { type: () => WorkspaceInviteLinkExpireTime })
    expireTime: WorkspaceInviteLinkExpireTime
  ): Promise<InviteLink> {
    await this.permissions.checkWorkspace(
      workspaceId,
      user.id,
      WorkspaceRole.Admin
    );
    const cacheWorkspaceId = `workspace:inviteLink:${workspaceId}`;
    const invite = await this.cache.get<{ inviteId: string }>(cacheWorkspaceId);
    if (typeof invite?.inviteId === 'string') {
      const expireTime = await this.cache.ttl(cacheWorkspaceId);
      if (Number.isSafeInteger(expireTime)) {
        return {
          link: this.url.link(`/invite/${invite.inviteId}`),
          expireTime: new Date(Date.now() + expireTime),
        };
      }
    }

    const inviteId = nanoid();
    const cacheInviteId = `workspace:inviteLinkId:${inviteId}`;
    await this.cache.set(cacheWorkspaceId, { inviteId }, { ttl: expireTime });
    await this.cache.set(
      cacheInviteId,
      { workspaceId, inviterUserId: user.id },
      { ttl: expireTime }
    );
    return {
      link: this.url.link(`/invite/${inviteId}`),
      expireTime: new Date(Date.now() + expireTime),
    };
  }

  @Mutation(() => Boolean)
  async revokeInviteLink(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string
  ) {
    await this.permissions.checkWorkspace(
      workspaceId,
      user.id,
      WorkspaceRole.Admin
    );
    const cacheId = `workspace:inviteLink:${workspaceId}`;
    return await this.cache.delete(cacheId);
  }

  @Mutation(() => String)
  async approveMember(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('userId') userId: string
  ) {
    await this.permissions.checkWorkspace(
      workspaceId,
      user.id,
      WorkspaceRole.Admin
    );

    try {
      // lock to prevent concurrent invite and grant
      const lockFlag = `invite:${workspaceId}`;
      await using lock = await this.mutex.acquire(lockFlag);
      if (!lock) {
        return new TooManyRequest();
      }

      const status = await this.permissions.getWorkspaceMemberStatus(
        workspaceId,
        userId
      );
      if (status) {
        if (status === WorkspaceMemberStatus.UnderReview) {
          const result = await this.permissions.grant(
            workspaceId,
            userId,
            WorkspaceRole.Collaborator,
            WorkspaceMemberStatus.Accepted
          );

          if (result) {
            this.event.emit('workspace.members.requestApproved', {
              inviteId: result,
            });
          }
          return result;
        }
        return new TooManyRequest();
      } else {
        return new MemberNotFoundInSpace({ spaceId: workspaceId });
      }
    } catch (e) {
      this.logger.error('failed to invite user', e);
      return new TooManyRequest();
    }
  }

  @Mutation(() => String)
  async grantMember(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('userId') userId: string,
    @Args('permission', { type: () => WorkspaceRole }) permission: WorkspaceRole
  ) {
    // non-team workspace can only transfer ownership, but no detailed permission control
    if (permission !== WorkspaceRole.Owner) {
      const isTeam = await this.workspaceService.isTeamWorkspace(workspaceId);
      if (!isTeam) {
        throw new ActionForbiddenOnNonTeamWorkspace();
      }
    }

    await this.permissions.checkWorkspace(
      workspaceId,
      user.id,
      permission >= WorkspaceRole.Admin
        ? WorkspaceRole.Owner
        : WorkspaceRole.Admin
    );

    try {
      // lock to prevent concurrent invite and grant
      const lockFlag = `invite:${workspaceId}`;
      await using lock = await this.mutex.acquire(lockFlag);
      if (!lock) {
        return new TooManyRequest();
      }

      const isMember = await this.permissions.isWorkspaceMember(
        workspaceId,
        userId
      );
      if (isMember) {
        const result = await this.permissions.grant(
          workspaceId,
          userId,
          permission
        );

        if (result) {
          if (permission === WorkspaceRole.Owner) {
            this.event.emit('workspace.members.ownershipTransferred', {
              workspaceId,
              from: user.id,
              to: userId,
            });
          } else {
            this.event.emit('workspace.members.roleChanged', {
              userId,
              workspaceId,
              permission,
            });
          }
        }

        return result;
      } else {
        return new MemberNotFoundInSpace({ spaceId: workspaceId });
      }
    } catch (e) {
      this.logger.error('failed to invite user', e);
      // pass through user friendly error
      if (e instanceof UserFriendlyError) {
        return e;
      }
      return new TooManyRequest();
    }
  }

  @OnEvent('workspace.members.reviewRequested')
  async onReviewRequested({
    inviteId,
  }: Events['workspace.members.reviewRequested']) {
    // send review request mail to owner and admin
    await this.workspaceService.sendReviewRequestedEmail(inviteId);
  }

  @OnEvent('workspace.members.requestApproved')
  async onApproveRequest({
    inviteId,
  }: Events['workspace.members.requestApproved']) {
    // send approve mail
    await this.workspaceService.sendReviewApproveEmail(inviteId);
  }

  @OnEvent('workspace.members.requestDeclined')
  async onDeclineRequest({
    userId,
    workspaceId,
  }: Events['workspace.members.requestDeclined']) {
    const user = await this.models.user.getPublicUser(userId);
    // send decline mail
    await this.workspaceService.sendReviewDeclinedEmail(
      user?.email,
      workspaceId
    );
  }

  @OnEvent('workspace.members.roleChanged')
  async onRoleChanged({
    userId,
    workspaceId,
    permission,
  }: Events['workspace.members.roleChanged']) {
    // send role changed mail
    await this.workspaceService.sendRoleChangedEmail(userId, {
      id: workspaceId,
      role: permission,
    });
  }

  @OnEvent('workspace.members.ownershipTransferred')
  async onOwnerTransferred({
    workspaceId,
    from,
    to,
  }: Events['workspace.members.ownershipTransferred']) {
    // send ownership transferred mail
    const fromUser = await this.models.user.getPublicUser(from);
    const toUser = await this.models.user.getPublicUser(to);

    if (fromUser) {
      await this.workspaceService.sendOwnershipTransferredEmail(
        fromUser.email,
        {
          id: workspaceId,
        }
      );
    }

    if (toUser) {
      await this.workspaceService.sendOwnershipReceivedEmail(toUser.email, {
        id: workspaceId,
      });
    }
  }
}
