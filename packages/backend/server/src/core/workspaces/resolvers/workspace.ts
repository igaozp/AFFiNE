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
  AFFiNELogger,
  AlreadyInSpace,
  Cache,
  DocNotFound,
  EventBus,
  InternalServerError,
  MemberQuotaExceeded,
  QueryTooLong,
  registerObjectType,
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
import {
  mapWorkspaceRoleToPermissions,
  PermissionService,
  WORKSPACE_ACTIONS,
  WorkspaceAction,
  WorkspaceRole,
} from '../../permission';
import { QuotaService, WorkspaceQuotaType } from '../../quota';
import { UserType } from '../../user';
import {
  InvitationType,
  InviteUserType,
  UpdateWorkspaceInput,
  WorkspaceType,
} from '../types';
import { WorkspaceService } from './service';

export type DotToUnderline<T extends string> =
  T extends `${infer Prefix}.${infer Suffix}`
    ? `${Prefix}_${DotToUnderline<Suffix>}`
    : T;

export function mapPermissionToGraphqlPermissions<A extends string>(
  permission: Record<A, boolean>
): Record<DotToUnderline<A>, boolean> {
  return Object.fromEntries(
    Object.entries(permission).map(([key, value]) => [
      key.replaceAll('.', '_'),
      value,
    ])
  ) as Record<DotToUnderline<A>, boolean>;
}

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

const WorkspacePermissions = registerObjectType<
  Record<DotToUnderline<WorkspaceAction>, boolean>
>(
  Object.fromEntries(
    WORKSPACE_ACTIONS.map(action => [
      action.replaceAll('.', '_'),
      {
        type: () => Boolean,
        options: {
          name: action.replaceAll('.', '_'),
        },
      },
    ])
  ),
  { name: 'WorkspacePermissions' }
);

@ObjectType()
export class WorkspaceRolePermissions {
  @Field(() => WorkspaceRole)
  role!: WorkspaceRole;

  @Field(() => WorkspacePermissions)
  permissions!: Record<DotToUnderline<WorkspaceAction>, boolean>;
}

/**
 * Workspace resolver
 * Public apis rate limit: 10 req/m
 * Other rate limit: 120 req/m
 */
@Resolver(() => WorkspaceType)
export class WorkspaceResolver {
  constructor(
    private readonly cache: Cache,
    private readonly prisma: PrismaClient,
    private readonly permissions: PermissionService,
    private readonly quota: QuotaService,
    private readonly models: Models,
    private readonly event: EventBus,
    private readonly mutex: RequestMutex,
    private readonly workspaceService: WorkspaceService,
    private readonly workspaceStorage: PgWorkspaceDocStorageAdapter,
    private readonly logger: AFFiNELogger
  ) {
    logger.setContext(WorkspaceResolver.name);
  }

  @ResolveField(() => WorkspaceRole, {
    description: 'Role of current signed in user in workspace',
    complexity: 2,
  })
  async role(
    @CurrentUser() user: CurrentUser,
    @Parent() workspace: WorkspaceType
  ) {
    // may applied in workspaces query
    if ('role' in workspace) {
      return workspace.role;
    }

    const role = await this.permissions.get(workspace.id, user.id);

    if (!role) {
      throw new SpaceAccessDenied({ spaceId: workspace.id });
    }

    return role;
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

  @ResolveField(() => WorkspaceQuotaType, {
    name: 'quota',
    description: 'quota of workspace',
    complexity: 2,
  })
  async workspaceQuota(
    @Parent() workspace: WorkspaceType
  ): Promise<WorkspaceQuotaType> {
    const quota = await this.quota.getWorkspaceQuotaWithUsage(workspace.id);
    return {
      ...quota,
      humanReadable: this.quota.formatWorkspaceQuota(quota),
    };
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
      WorkspaceRole.Admin
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
        role: type,
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

  @Query(() => WorkspaceRolePermissions, {
    description: 'Get workspace role permissions',
  })
  async workspaceRolePermissions(
    @CurrentUser() user: CurrentUser,
    @Args('id') id: string
  ): Promise<WorkspaceRolePermissions> {
    const workspace = await this.prisma.workspaceUserPermission.findFirst({
      where: { workspaceId: id, userId: user.id },
    });
    if (!workspace) {
      throw new SpaceAccessDenied({ spaceId: id });
    }
    return {
      role: workspace.type,
      permissions: mapPermissionToGraphqlPermissions(
        mapWorkspaceRoleToPermissions(workspace.type)
      ),
    };
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
            type: WorkspaceRole.Owner,
            userId: user.id,
            accepted: true,
            status: WorkspaceMemberStatus.Accepted,
          },
        },
      },
    });

    if (init) {
      // convert stream to buffer
      const chunks: Uint8Array[] = [];
      try {
        for await (const chunk of init.createReadStream()) {
          chunks.push(chunk);
        }
      } catch (e) {
        this.logger.error('Failed to get file content from upload stream', e);
        chunks.length = 0;
      }
      const buffer = chunks.length ? Buffer.concat(chunks) : null;

      if (buffer) {
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
    await this.permissions.checkWorkspace(id, user.id, WorkspaceRole.Admin);

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
    await this.permissions.checkWorkspace(id, user.id, WorkspaceRole.Owner);

    await this.prisma.workspace.delete({
      where: {
        id,
      },
    });
    await this.workspaceStorage.deleteSpace(id);

    this.event.emit('workspace.deleted', { id });

    return true;
  }

  @Mutation(() => String)
  async invite(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('email') email: string,
    @Args('sendInviteMail', { nullable: true }) sendInviteMail: boolean,
    @Args('permission', {
      type: () => WorkspaceRole,
      nullable: true,
      deprecationReason: 'never used',
    })
    _permission?: WorkspaceRole
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
        throw new TooManyRequest();
      }

      // member limit check
      await this.quota.checkSeat(workspaceId);

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
        WorkspaceRole.Collaborator
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
        throw e;
      }
      this.logger.error('failed to invite user', e);
      throw new TooManyRequest();
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
    const isAdmin = await this.permissions.tryCheckWorkspaceIs(
      workspaceId,
      userId,
      WorkspaceRole.Admin
    );

    if (isAdmin) {
      // only owner can revoke workspace admin
      await this.permissions.checkWorkspaceIs(
        workspaceId,
        user.id,
        WorkspaceRole.Owner
      );
    } else {
      await this.permissions.checkWorkspace(
        workspaceId,
        user.id,
        WorkspaceRole.Admin
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
      throw new TooManyRequest();
    }

    if (user) {
      const status = await this.permissions.getWorkspaceMemberStatus(
        workspaceId,
        user.id
      );
      if (status === WorkspaceMemberStatus.Accepted) {
        throw new AlreadyInSpace({ spaceId: workspaceId });
      }

      // invite link
      const invite = await this.cache.get<{ inviteId: string }>(
        `workspace:inviteLink:${workspaceId}`
      );
      if (invite?.inviteId === inviteId) {
        const isTeam = await this.workspaceService.isTeamWorkspace(workspaceId);
        const seatAvailable = await this.quota.tryCheckSeat(workspaceId);
        if (!seatAvailable) {
          // only team workspace allow over limit
          if (isTeam) {
            await this.permissions.grant(
              workspaceId,
              user.id,
              WorkspaceRole.Collaborator,
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
            throw new MemberQuotaExceeded();
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
