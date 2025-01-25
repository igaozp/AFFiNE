import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaClient, WorkspaceMemberStatus } from '@prisma/client';
import { groupBy } from 'lodash-es';

import {
  DocAccessDenied,
  EventEmitter,
  SpaceAccessDenied,
  SpaceOwnerNotFound,
} from '../../base';
import { Permission, PublicPageMode } from './types';

@Injectable()
export class PermissionService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly event: EventEmitter
  ) {}

  private get acceptedCondition() {
    return [
      {
        accepted: true,
      },
      {
        status: WorkspaceMemberStatus.Accepted,
      },
    ];
  }

  /// Start regin: workspace permission
  async get(ws: string, user: string) {
    const data = await this.prisma.workspaceUserPermission.findFirst({
      where: {
        workspaceId: ws,
        userId: user,
        OR: this.acceptedCondition,
      },
    });

    return data?.type as Permission;
  }

  /**
   * check whether a workspace exists and has any one can access it
   * @param workspaceId workspace id
   * @returns
   */
  async hasWorkspace(workspaceId: string) {
    return await this.prisma.workspaceUserPermission
      .count({
        where: {
          workspaceId,
          OR: this.acceptedCondition,
        },
      })
      .then(count => count > 0);
  }

  async getOwnedWorkspaces(userId: string) {
    return this.prisma.workspaceUserPermission
      .findMany({
        where: {
          userId,
          type: Permission.Owner,
          OR: this.acceptedCondition,
        },
        select: {
          workspaceId: true,
        },
      })
      .then(data => data.map(({ workspaceId }) => workspaceId));
  }

  async getWorkspaceOwner(workspaceId: string) {
    const owner = await this.prisma.workspaceUserPermission.findFirst({
      where: {
        workspaceId,
        type: Permission.Owner,
      },
      include: {
        user: true,
      },
    });

    if (!owner) {
      throw new SpaceOwnerNotFound({ spaceId: workspaceId });
    }

    return owner.user;
  }

  async getWorkspaceAdmin(workspaceId: string) {
    const admin = await this.prisma.workspaceUserPermission.findMany({
      where: {
        workspaceId,
        type: Permission.Admin,
      },
      include: {
        user: true,
      },
    });

    return admin.map(({ user }) => user);
  }

  async getWorkspaceMemberCount(workspaceId: string) {
    return this.prisma.workspaceUserPermission.count({
      where: {
        workspaceId,
      },
    });
  }

  async tryGetWorkspaceOwner(workspaceId: string) {
    return this.prisma.workspaceUserPermission.findFirst({
      where: {
        workspaceId,
        type: Permission.Owner,
      },
      include: {
        user: true,
      },
    });
  }

  /**
   * check if a doc binary is accessible by a user
   */
  async isPublicAccessible(
    ws: string,
    id: string,
    user?: string
  ): Promise<boolean> {
    if (ws === id) {
      // if workspace is public or have any public page, then allow to access
      const [isPublicWorkspace, publicPages] = await Promise.all([
        this.tryCheckWorkspace(ws, user, Permission.Read),
        this.prisma.workspacePage.count({
          where: {
            workspaceId: ws,
            public: true,
          },
        }),
      ]);
      return isPublicWorkspace || publicPages > 0;
    }

    return this.tryCheckPage(ws, id, user);
  }

  async getWorkspaceMemberStatus(ws: string, user: string) {
    return this.prisma.workspaceUserPermission
      .findFirst({
        where: {
          workspaceId: ws,
          userId: user,
        },
        select: { status: true },
      })
      .then(r => r?.status);
  }

  /**
   * Returns whether a given user is a member of a workspace and has the given or higher permission.
   */
  async isWorkspaceMember(
    ws: string,
    user: string,
    permission: Permission = Permission.Read
  ): Promise<boolean> {
    const count = await this.prisma.workspaceUserPermission.count({
      where: {
        workspaceId: ws,
        userId: user,
        OR: this.acceptedCondition,
        type: {
          gte: permission,
        },
      },
    });

    return count !== 0;
  }

  /**
   * only check permission if the workspace is a cloud workspace
   * @param workspaceId workspace id
   * @param userId user id, check if is a public workspace if not provided
   * @param permission default is read
   */
  async checkCloudWorkspace(
    workspaceId: string,
    userId?: string,
    permission: Permission = Permission.Read
  ) {
    const hasWorkspace = await this.hasWorkspace(workspaceId);
    if (hasWorkspace) {
      await this.checkWorkspace(workspaceId, userId, permission);
    }
  }

  async checkWorkspace(
    ws: string,
    user?: string,
    permission: Permission = Permission.Read
  ) {
    if (!(await this.tryCheckWorkspace(ws, user, permission))) {
      throw new SpaceAccessDenied({ spaceId: ws });
    }
  }

  async tryCheckWorkspace(
    ws: string,
    user?: string,
    permission: Permission = Permission.Read
  ) {
    // If the permission is read, we should check if the workspace is public
    if (permission === Permission.Read) {
      const count = await this.prisma.workspace.count({
        where: { id: ws, public: true },
      });

      // workspace is public
      // accessible
      if (count > 0) {
        return true;
      }
    }

    if (user) {
      // normally check if the user has the permission
      const count = await this.prisma.workspaceUserPermission.count({
        where: {
          workspaceId: ws,
          userId: user,
          OR: this.acceptedCondition,
          type: {
            gte: permission,
          },
        },
      });

      return count > 0;
    }

    // unsigned in, workspace is not public
    // unaccessible
    return false;
  }

  async checkWorkspaceIs(
    ws: string,
    user: string,
    permission: Permission = Permission.Read
  ) {
    if (!(await this.tryCheckWorkspaceIs(ws, user, permission))) {
      throw new SpaceAccessDenied({ spaceId: ws });
    }
  }

  async tryCheckWorkspaceIs(
    ws: string,
    user: string,
    permission: Permission = Permission.Read
  ) {
    const count = await this.prisma.workspaceUserPermission.count({
      where: {
        workspaceId: ws,
        userId: user,
        OR: this.acceptedCondition,
        type: permission,
      },
    });

    return count > 0;
  }

  async allowUrlPreview(ws: string) {
    const count = await this.prisma.workspace.count({
      where: {
        id: ws,
        enableUrlPreview: true,
      },
    });

    return count > 0;
  }

  private getAllowedStatusSource(
    to: WorkspaceMemberStatus
  ): WorkspaceMemberStatus[] {
    switch (to) {
      case WorkspaceMemberStatus.NeedMoreSeat:
        return [WorkspaceMemberStatus.Pending];
      case WorkspaceMemberStatus.NeedMoreSeatAndReview:
        return [WorkspaceMemberStatus.UnderReview];
      case WorkspaceMemberStatus.Pending:
      case WorkspaceMemberStatus.UnderReview:
        return [WorkspaceMemberStatus.Accepted];
      default:
        return [];
    }
  }

  async grant(
    ws: string,
    user: string,
    permission: Permission = Permission.Read,
    status: WorkspaceMemberStatus = WorkspaceMemberStatus.Pending
  ): Promise<string> {
    const data = await this.prisma.workspaceUserPermission.findFirst({
      where: { workspaceId: ws, userId: user },
    });

    if (data) {
      const toBeOwner = permission === Permission.Owner;
      if (data.accepted && data.status === WorkspaceMemberStatus.Accepted) {
        const [p] = await this.prisma.$transaction(
          [
            this.prisma.workspaceUserPermission.update({
              where: {
                workspaceId_userId: { workspaceId: ws, userId: user },
              },
              data: { type: permission },
            }),

            // If the new permission is owner, we need to revoke old owner
            toBeOwner
              ? this.prisma.workspaceUserPermission.updateMany({
                  where: {
                    workspaceId: ws,
                    type: Permission.Owner,
                    userId: { not: user },
                  },
                  data: { type: Permission.Admin },
                })
              : null,
          ].filter(Boolean) as Prisma.PrismaPromise<any>[]
        );

        return p.id;
      }
      const allowedStatus = this.getAllowedStatusSource(data.status);
      if (allowedStatus.includes(status)) {
        const ret = await this.prisma.workspaceUserPermission.update({
          where: { workspaceId_userId: { workspaceId: ws, userId: user } },
          data: { status },
        });
        return ret.id;
      }
      return data.id;
    }

    return this.prisma.workspaceUserPermission
      .create({
        data: {
          workspaceId: ws,
          userId: user,
          type: permission,
          status,
        },
      })
      .then(p => p.id);
  }

  async acceptWorkspaceInvitation(
    invitationId: string,
    workspaceId: string,
    status: WorkspaceMemberStatus = WorkspaceMemberStatus.Accepted
  ) {
    const result = await this.prisma.workspaceUserPermission.updateMany({
      where: {
        id: invitationId,
        workspaceId: workspaceId,
        AND: [{ accepted: false }, { status: WorkspaceMemberStatus.Pending }],
      },
      data: { accepted: true, status },
    });

    return result.count > 0;
  }

  async refreshSeatStatus(workspaceId: string, memberLimit: number) {
    const usedCount = await this.prisma.workspaceUserPermission.count({
      where: { workspaceId, status: WorkspaceMemberStatus.Accepted },
    });

    const availableCount = memberLimit - usedCount;

    if (availableCount <= 0) {
      return;
    }

    await this.prisma.$transaction(async tx => {
      const members = await tx.workspaceUserPermission.findMany({
        select: { id: true, status: true },
        where: {
          workspaceId,
          status: {
            in: [
              WorkspaceMemberStatus.NeedMoreSeat,
              WorkspaceMemberStatus.NeedMoreSeatAndReview,
            ],
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const needChange = members.slice(0, availableCount);
      const { NeedMoreSeat, NeedMoreSeatAndReview } = groupBy(
        needChange,
        m => m.status
      );

      const toPendings = NeedMoreSeat ?? [];
      if (toPendings.length > 0) {
        await tx.workspaceUserPermission.updateMany({
          where: { id: { in: toPendings.map(m => m.id) } },
          data: { status: WorkspaceMemberStatus.Pending },
        });
      }

      const toUnderReviewUserIds = NeedMoreSeatAndReview ?? [];
      if (toUnderReviewUserIds.length > 0) {
        await tx.workspaceUserPermission.updateMany({
          where: { id: { in: toUnderReviewUserIds.map(m => m.id) } },
          data: { status: WorkspaceMemberStatus.UnderReview },
        });
      }

      return [toPendings, toUnderReviewUserIds] as const;
    });
  }

  async revokeWorkspace(workspaceId: string, user: string) {
    const permission = await this.prisma.workspaceUserPermission.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user } },
    });

    // We shouldn't revoke owner permission
    // should auto deleted by workspace/user delete cascading
    if (!permission || permission.type === Permission.Owner) {
      return false;
    }

    await this.prisma.workspaceUserPermission.deleteMany({
      where: {
        workspaceId,
        userId: user,
      },
    });

    const count = await this.prisma.workspaceUserPermission.count({
      where: { workspaceId },
    });

    this.event.emit('workspace.members.updated', {
      workspaceId,
      count,
    });
    this.event.emit('workspace.members.removed', {
      workspaceId,
      userId: user,
    });

    if (
      permission.status === 'UnderReview' ||
      permission.status === 'NeedMoreSeatAndReview'
    ) {
      this.event.emit('workspace.members.requestDeclined', {
        userId: user,
        workspaceId,
      });
    }

    return true;
  }
  /// End regin: workspace permission

  /// Start regin: page permission
  /**
   * only check permission if the workspace is a cloud workspace
   * @param workspaceId workspace id
   * @param pageId page id aka doc id
   * @param userId user id, check if is a public page if not provided
   * @param permission default is read
   */
  async checkCloudPagePermission(
    workspaceId: string,
    pageId: string,
    userId?: string,
    permission = Permission.Read
  ) {
    const hasWorkspace = await this.hasWorkspace(workspaceId);
    if (hasWorkspace) {
      await this.checkPagePermission(workspaceId, pageId, userId, permission);
    }
  }

  async checkPagePermission(
    ws: string,
    page: string,
    user?: string,
    permission = Permission.Read
  ) {
    if (!(await this.tryCheckPage(ws, page, user, permission))) {
      throw new DocAccessDenied({ spaceId: ws, docId: page });
    }
  }

  async tryCheckPage(
    ws: string,
    page: string,
    user?: string,
    permission = Permission.Read
  ) {
    // check whether page is public
    if (permission === Permission.Read) {
      const count = await this.prisma.workspacePage.count({
        where: {
          workspaceId: ws,
          pageId: page,
          public: true,
        },
      });

      // page is public
      // accessible
      if (count > 0) {
        return true;
      }
    }

    if (user) {
      const count = await this.prisma.workspacePageUserPermission.count({
        where: {
          workspaceId: ws,
          pageId: page,
          userId: user,
          accepted: true,
          type: {
            gte: permission,
          },
        },
      });

      // page shared to user
      // accessible
      if (count > 0) {
        return true;
      }
    }

    // check whether user has workspace related permission
    return this.tryCheckWorkspace(ws, user, permission);
  }

  async isPublicPage(ws: string, page: string) {
    return this.prisma.workspacePage
      .count({
        where: {
          workspaceId: ws,
          pageId: page,
          public: true,
        },
      })
      .then(count => count > 0);
  }

  async publishPage(ws: string, page: string, mode = PublicPageMode.Page) {
    return this.prisma.workspacePage.upsert({
      where: {
        workspaceId_pageId: {
          workspaceId: ws,
          pageId: page,
        },
      },
      update: {
        public: true,
        mode,
      },
      create: {
        workspaceId: ws,
        pageId: page,
        mode,
        public: true,
      },
    });
  }

  async revokePublicPage(ws: string, page: string) {
    return this.prisma.workspacePage.upsert({
      where: {
        workspaceId_pageId: {
          workspaceId: ws,
          pageId: page,
        },
      },
      update: {
        public: false,
      },
      create: {
        workspaceId: ws,
        pageId: page,
        public: false,
      },
    });
  }

  async grantPage(
    ws: string,
    page: string,
    user: string,
    permission: Permission = Permission.Read
  ) {
    const data = await this.prisma.workspacePageUserPermission.findFirst({
      where: {
        workspaceId: ws,
        pageId: page,
        userId: user,
        accepted: true,
      },
    });

    if (data) {
      const [p] = await this.prisma.$transaction(
        [
          this.prisma.workspacePageUserPermission.update({
            where: {
              id: data.id,
            },
            data: {
              type: permission,
            },
          }),

          // If the new permission is owner, we need to revoke old owner
          permission === Permission.Owner
            ? this.prisma.workspacePageUserPermission.updateMany({
                where: {
                  workspaceId: ws,
                  pageId: page,
                  type: Permission.Owner,
                  userId: {
                    not: user,
                  },
                },
                data: {
                  type: Permission.Admin,
                },
              })
            : null,
        ].filter(Boolean) as Prisma.PrismaPromise<any>[]
      );

      return p.id;
    }

    return this.prisma.workspacePageUserPermission
      .create({
        data: {
          workspaceId: ws,
          pageId: page,
          userId: user,
          type: permission,
        },
      })
      .then(p => p.id);
  }

  async revokePage(ws: string, page: string, user: string) {
    const result = await this.prisma.workspacePageUserPermission.deleteMany({
      where: {
        workspaceId: ws,
        pageId: page,
        userId: user,
        type: {
          // We shouldn't revoke owner permission, should auto deleted by workspace/user delete cascading
          not: Permission.Owner,
        },
      },
    });

    return result.count > 0;
  }
  /// End regin: page permission
}
