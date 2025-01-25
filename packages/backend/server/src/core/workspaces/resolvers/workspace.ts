import { Logger } from '@nestjs/common';
import {
  Args,
  Field,
  Int,
  Mutation,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Prisma, PrismaClient, WorkspaceMemberStatus } from '@prisma/client';
import GraphQLUpload from 'graphql-upload/GraphQLUpload.mjs';

import type { FileUpload } from '../../../base';
import {
  AlreadyInSpace,
  Cache,
  DocNotFound,
  EventEmitter,
  InternalServerError,
  MemberQuotaExceeded,
  QueryTooLong,
  RequestMutex,
  SpaceAccessDenied,
  SpaceNotFound,
  Throttle,
  TooManyRequest,
  UserFriendlyError,
  UserNotFound,
} from '../../../base';
import { Models } from '../../../models';
import { CurrentUser, Public } from '../../auth';
import { type Editor, PgWorkspaceDocStorageAdapter } from '../../doc';
import { Permission, PermissionService } from '../../permission';
import { QuotaManagementService, QuotaQueryType } from '../../quota';
import { UserType } from '../../user';
import {
  InvitationType,
  InviteUserType,
  UpdateWorkspaceInput,
  WorkspaceType,
} from '../types';
import { WorkspaceService } from './service';

@ObjectType()
export class EditorType implements Partial<Editor> {
  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  avatarUrl!: string | null;
}

@ObjectType()
class WorkspacePageMeta {
  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => EditorType, { nullable: true })
  createdBy!: EditorType | null;

  @Field(() => EditorType, { nullable: true })
  updatedBy!: EditorType | null;
}

/**
 * Workspace resolver
 * Public apis rate limit: 10 req/m
 * Other rate limit: 120 req/m
 */
@Resolver(() => WorkspaceType)
export class WorkspaceResolver {
  private readonly logger = new Logger(WorkspaceResolver.name);

  constructor(
    private readonly cache: Cache,
    private readonly prisma: PrismaClient,
    private readonly permissions: PermissionService,
    private readonly quota: QuotaManagementService,
    private readonly models: Models,
    private readonly event: EventEmitter,
    private readonly mutex: RequestMutex,
    private readonly workspaceService: WorkspaceService,
    private readonly workspaceStorage: PgWorkspaceDocStorageAdapter
  ) {}

  @ResolveField(() => Permission, {
    description: 'Permission of current signed in user in workspace',
    complexity: 2,
  })
  async permission(
    @CurrentUser() user: CurrentUser,
    @Parent() workspace: WorkspaceType
  ) {
    // may applied in workspaces query
    if ('permission' in workspace) {
      return workspace.permission;
    }

    const permission = await this.permissions.get(workspace.id, user.id);

    if (!permission) {
      throw new SpaceAccessDenied({ spaceId: workspace.id });
    }

    return permission;
  }

  @ResolveField(() => Int, {
    description: 'member count of workspace',
    complexity: 2,
  })
  memberCount(@Parent() workspace: WorkspaceType) {
    return this.permissions.getWorkspaceMemberCount(workspace.id);
  }

  @ResolveField(() => Boolean, {
    description: 'is current workspace initialized',
    complexity: 2,
  })
  async initialized(@Parent() workspace: WorkspaceType) {
    return this.prisma.snapshot
      .count({
        where: {
          id: workspace.id,
          workspaceId: workspace.id,
        },
      })
      .then(count => count > 0);
  }

  @ResolveField(() => UserType, {
    description: 'Owner of workspace',
    complexity: 2,
  })
  async owner(@Parent() workspace: WorkspaceType) {
    return this.permissions.getWorkspaceOwner(workspace.id);
  }

  @ResolveField(() => [InviteUserType], {
    description: 'Members of workspace',
    complexity: 2,
  })
  async members(
    @Parent() workspace: WorkspaceType,
    @Args('skip', { type: () => Int, nullable: true }) skip?: number,
    @Args('take', { type: () => Int, nullable: true }) take?: number,
    @Args('query', { type: () => String, nullable: true }) query?: string
  ) {
    const args: Prisma.WorkspaceUserPermissionFindManyArgs = {
      where: { workspaceId: workspace.id },
      skip,
      take: take || 8,
      orderBy: [{ createdAt: 'asc' }, { type: 'desc' }],
    };

    if (query) {
      if (query.length > 255) {
        throw new QueryTooLong({ max: 255 });
      }

      // @ts-expect-error not null
      args.where.user = {
        // TODO(@forehalo): case-insensitive search later
        OR: [{ name: { contains: query } }, { email: { contains: query } }],
      };
    }

    const data = await this.prisma.workspaceUserPermission.findMany({
      ...args,
      include: {
        user: true,
      },
    });

    return data.map(({ id, accepted, status, type, user }) => ({
      ...user,
      permission: type,
      inviteId: id,
      accepted,
      status,
    }));
  }

  @ResolveField(() => WorkspacePageMeta, {
    description: 'Cloud page metadata of workspace',
    complexity: 2,
  })
  async pageMeta(
    @Parent() workspace: WorkspaceType,
    @Args('pageId') pageId: string
  ) {
    const metadata = await this.prisma.snapshot.findFirst({
      where: { workspaceId: workspace.id, id: pageId },
      select: {
        createdAt: true,
        updatedAt: true,
        createdByUser: { select: { name: true, avatarUrl: true } },
        updatedByUser: { select: { name: true, avatarUrl: true } },
      },
    });
    if (!metadata) {
      throw new DocNotFound({ spaceId: workspace.id, docId: pageId });
    }

    return {
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt,
      createdBy: metadata.createdByUser || null,
      updatedBy: metadata.updatedByUser || null,
    };
  }

  @ResolveField(() => QuotaQueryType, {
    name: 'quota',
    description: 'quota of workspace',
    complexity: 2,
  })
  workspaceQuota(@Parent() workspace: WorkspaceType) {
    return this.quota.getWorkspaceUsage(workspace.id);
  }

  @Query(() => Boolean, {
    description: 'Get is owner of workspace',
    complexity: 2,
  })
  async isOwner(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string
  ) {
    const data = await this.permissions.tryGetWorkspaceOwner(workspaceId);

    return data?.user?.id === user.id;
  }

  @Query(() => Boolean, {
    description: 'Get is admin of workspace',
    complexity: 2,
  })
  async isAdmin(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string
  ) {
    return this.permissions.tryCheckWorkspaceIs(
      workspaceId,
      user.id,
      Permission.Admin
    );
  }

  @Query(() => [WorkspaceType], {
    description: 'Get all accessible workspaces for current user',
    complexity: 2,
  })
  async workspaces(@CurrentUser() user: CurrentUser) {
    const data = await this.prisma.workspaceUserPermission.findMany({
      where: {
        userId: user.id,
        OR: [
          {
            accepted: true,
          },
          {
            status: WorkspaceMemberStatus.Accepted,
          },
        ],
      },
      include: {
        workspace: true,
      },
    });

    return data.map(({ workspace, type }) => {
      return {
        ...workspace,
        permission: type,
      };
    });
  }

  @Query(() => WorkspaceType, {
    description: 'Get workspace by id',
  })
  async workspace(@CurrentUser() user: CurrentUser, @Args('id') id: string) {
    await this.permissions.checkWorkspace(id, user.id);
    const workspace = await this.prisma.workspace.findUnique({ where: { id } });

    if (!workspace) {
      throw new SpaceNotFound({ spaceId: id });
    }

    return workspace;
  }

  @Mutation(() => WorkspaceType, {
    description: 'Create a new workspace',
  })
  async createWorkspace(
    @CurrentUser() user: CurrentUser,
    // we no longer support init workspace with a preload file
    // use sync system to uploading them once created
    @Args({ name: 'init', type: () => GraphQLUpload, nullable: true })
    init: FileUpload | null
  ) {
    const workspace = await this.prisma.workspace.create({
      data: {
        public: false,
        permissions: {
          create: {
            type: Permission.Owner,
            userId: user.id,
            accepted: true,
            status: WorkspaceMemberStatus.Accepted,
          },
        },
      },
    });

    if (init) {
      // convert stream to buffer
      const buffer = await new Promise<Buffer>(resolve => {
        const stream = init.createReadStream();
        const chunks: Uint8Array[] = [];
        stream.on('data', chunk => {
          chunks.push(chunk);
        });
        stream.on('error', () => {
          resolve(Buffer.from([]));
        });
        stream.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
      });

      if (buffer.length) {
        await this.prisma.snapshot.create({
          data: {
            id: workspace.id,
            workspaceId: workspace.id,
            blob: buffer,
            updatedAt: new Date(),
          },
        });
      }
    }

    return workspace;
  }

  @Mutation(() => WorkspaceType, {
    description: 'Update workspace',
  })
  async updateWorkspace(
    @CurrentUser() user: CurrentUser,
    @Args({ name: 'input', type: () => UpdateWorkspaceInput })
    { id, ...updates }: UpdateWorkspaceInput
  ) {
    const isTeam = await this.quota.isTeamWorkspace(id);
    await this.permissions.checkWorkspace(
      id,
      user.id,
      isTeam ? Permission.Owner : Permission.Admin
    );

    return this.prisma.workspace.update({
      where: {
        id,
      },
      data: updates,
    });
  }

  @Mutation(() => Boolean)
  async deleteWorkspace(
    @CurrentUser() user: CurrentUser,
    @Args('id') id: string
  ) {
    await this.permissions.checkWorkspace(id, user.id, Permission.Owner);

    await this.prisma.workspace.delete({
      where: {
        id,
      },
    });
    await this.workspaceStorage.deleteSpace(id);

    this.event.emit('workspace.deleted', id);

    return true;
  }

  @Mutation(() => String)
  async invite(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('email') email: string,
    @Args('sendInviteMail', { nullable: true }) sendInviteMail: boolean,
    @Args('permission', {
      type: () => Permission,
      nullable: true,
      deprecationReason: 'never used',
    })
    _permission?: Permission
  ) {
    await this.permissions.checkWorkspace(
      workspaceId,
      user.id,
      Permission.Admin
    );

    try {
      // lock to prevent concurrent invite and grant
      const lockFlag = `invite:${workspaceId}`;
      await using lock = await this.mutex.acquire(lockFlag);
      if (!lock) {
        return new TooManyRequest();
      }

      // member limit check
      await this.quota.checkWorkspaceSeat(workspaceId);

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
        if (originRecord) return originRecord.id;
      } else {
        target = await this.models.user.create({
          email,
          registered: false,
        });
      }

      const inviteId = await this.permissions.grant(
        workspaceId,
        target.id,
        Permission.Write
      );
      if (sendInviteMail) {
        try {
          await this.workspaceService.sendInviteEmail(inviteId);
        } catch (e) {
          const ret = await this.permissions.revokeWorkspace(
            workspaceId,
            target.id
          );

          if (!ret) {
            this.logger.fatal(
              `failed to send ${workspaceId} invite email to ${email} and failed to revoke permission: ${inviteId}, ${e}`
            );
          } else {
            this.logger.warn(
              `failed to send ${workspaceId} invite email to ${email}, but successfully revoked permission: ${e}`
            );
          }
          throw new InternalServerError(
            'Failed to send invite email. Please try again.'
          );
        }
      }
      return inviteId;
    } catch (e) {
      // pass through user friendly error
      if (e instanceof UserFriendlyError) {
        return e;
      }
      this.logger.error('failed to invite user', e);
      return new TooManyRequest();
    }
  }

  @Throttle('strict')
  @Public()
  @Query(() => InvitationType, {
    description: 'send workspace invitation',
  })
  async getInviteInfo(
    @CurrentUser() user: UserType | undefined,
    @Args('inviteId') inviteId: string
  ) {
    const { workspaceId, inviteeUserId } =
      await this.workspaceService.getInviteInfo(inviteId);
    const workspace = await this.workspaceService.getWorkspaceInfo(workspaceId);
    const owner = await this.permissions.getWorkspaceOwner(workspaceId);

    const inviteeId = inviteeUserId || user?.id;
    if (!inviteeId) throw new UserNotFound();
    const invitee = await this.models.user.getPublicUser(inviteeId);

    return { workspace, user: owner, invitee };
  }

  @Mutation(() => Boolean)
  async revoke(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('userId') userId: string
  ) {
    const isTeam = await this.quota.isTeamWorkspace(workspaceId);
    const isAdmin = await this.permissions.tryCheckWorkspaceIs(
      workspaceId,
      userId,
      Permission.Admin
    );
    if (isTeam && isAdmin) {
      // only owner can revoke team workspace admin
      await this.permissions.checkWorkspaceIs(
        workspaceId,
        user.id,
        Permission.Owner
      );
    } else {
      await this.permissions.checkWorkspace(
        workspaceId,
        user.id,
        Permission.Admin
      );
    }

    return await this.permissions.revokeWorkspace(workspaceId, userId);
  }

  @Mutation(() => Boolean)
  @Public()
  async acceptInviteById(
    @CurrentUser() user: CurrentUser | undefined,
    @Args('workspaceId') workspaceId: string,
    @Args('inviteId') inviteId: string,
    @Args('sendAcceptMail', { nullable: true }) sendAcceptMail: boolean
  ) {
    const lockFlag = `invite:${workspaceId}`;
    await using lock = await this.mutex.acquire(lockFlag);
    if (!lock) {
      return new TooManyRequest();
    }

    const isTeam = await this.quota.isTeamWorkspace(workspaceId);
    if (user) {
      const status = await this.permissions.getWorkspaceMemberStatus(
        workspaceId,
        user.id
      );
      if (status === WorkspaceMemberStatus.Accepted) {
        return new AlreadyInSpace({ spaceId: workspaceId });
      }

      // invite link
      const invite = await this.cache.get<{ inviteId: string }>(
        `workspace:inviteLink:${workspaceId}`
      );
      if (invite?.inviteId === inviteId) {
        const quota = await this.quota.getWorkspaceUsage(workspaceId);
        if (quota.memberCount >= quota.memberLimit) {
          // only team workspace allow over limit
          if (isTeam) {
            await this.permissions.grant(
              workspaceId,
              user.id,
              Permission.Write,
              WorkspaceMemberStatus.NeedMoreSeatAndReview
            );
            const memberCount =
              await this.permissions.getWorkspaceMemberCount(workspaceId);
            this.event.emit('workspace.members.updated', {
              workspaceId,
              count: memberCount,
            });
            return true;
          } else if (!status) {
            return new MemberQuotaExceeded();
          }
        } else {
          const inviteId = await this.permissions.grant(workspaceId, user.id);
          if (isTeam) {
            this.event.emit('workspace.members.reviewRequested', {
              inviteId,
            });
          }
          // invite by link need admin to approve
          return await this.permissions.acceptWorkspaceInvitation(
            inviteId,
            workspaceId,
            isTeam
              ? WorkspaceMemberStatus.UnderReview
              : WorkspaceMemberStatus.Accepted
          );
        }
      }
    }

    // we added seats when sending invitation emails, but the payment may fail
    // so we need to check seat again here
    await this.quota.checkWorkspaceSeat(workspaceId, true);

    if (sendAcceptMail) {
      const success = await this.workspaceService.sendAcceptedEmail(inviteId);
      if (!success) throw new UserNotFound();
    }

    return await this.permissions.acceptWorkspaceInvitation(
      inviteId,
      workspaceId
    );
  }

  @Mutation(() => Boolean)
  async leaveWorkspace(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('sendLeaveMail', { nullable: true }) sendLeaveMail?: boolean,
    @Args('workspaceName', {
      nullable: true,
      deprecationReason: 'no longer used',
    })
    _workspaceName?: string
  ) {
    await this.permissions.checkWorkspace(workspaceId, user.id);
    const success = this.permissions.revokeWorkspace(workspaceId, user.id);

    if (sendLeaveMail) {
      this.event.emit('workspace.members.leave', {
        workspaceId,
        user: {
          id: user.id,
          email: user.email,
        },
      });
    }

    return success;
  }
}
