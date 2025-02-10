import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import {
  type Workspace,
  WorkspaceMemberStatus,
  type WorkspaceUserPermission,
} from '@prisma/client';
import { groupBy } from 'lodash-es';

import { EventBus } from '../base';
import { WorkspaceRole } from '../core/permission';
import { BaseModel } from './base';

declare global {
  interface Events {
    'workspace.members.reviewRequested': { inviteId: string };
    'workspace.members.requestDeclined': {
      userId: string;
      workspaceId: string;
    };
    'workspace.members.requestApproved': { inviteId: string };
    'workspace.members.roleChanged': {
      userId: string;
      workspaceId: string;
      permission: number;
    };
    'workspace.members.ownershipTransferred': {
      from: string;
      to: string;
      workspaceId: string;
    };
    'workspace.members.updated': {
      workspaceId: string;
      count: number;
    };
    'workspace.members.leave': {
      user: {
        id: string;
        email: string;
      };
      workspaceId: string;
    };
    'workspace.members.removed': {
      workspaceId: string;
      userId: string;
    };
    'workspace.deleted': {
      id: string;
    };
    'workspace.blob.delete': {
      workspaceId: string;
      key: string;
    };
    'workspace.blob.sync': {
      workspaceId: string;
      key: string;
    };
  }
}

export { WorkspaceMemberStatus };
export type { Workspace };
export type UpdateWorkspaceInput = Pick<
  Partial<Workspace>,
  'public' | 'enableAi' | 'enableUrlPreview'
>;

export interface FindWorkspaceMembersOptions {
  skip?: number;
  /**
   * Default to `8`
   */
  take?: number;
}

@Injectable()
export class WorkspaceModel extends BaseModel {
  constructor(private readonly event: EventBus) {
    super();
  }

  // #region workspace

  /**
   * Create a new workspace for the user, default to private.
   */
  async create(userId: string) {
    const workspace = await this.db.workspace.create({
      data: {
        public: false,
        permissions: {
          create: {
            type: WorkspaceRole.Owner,
            userId: userId,
            accepted: true,
            status: WorkspaceMemberStatus.Accepted,
          },
        },
      },
    });
    this.logger.log(`Created workspace ${workspace.id} for user ${userId}`);
    return workspace;
  }

  /**
   * Update the workspace with the given data.
   */
  async update(workspaceId: string, data: UpdateWorkspaceInput) {
    await this.db.workspace.update({
      where: {
        id: workspaceId,
      },
      data,
    });
    this.logger.log(
      `Updated workspace ${workspaceId} with data ${JSON.stringify(data)}`
    );
  }

  async get(workspaceId: string) {
    return await this.db.workspace.findUnique({
      where: {
        id: workspaceId,
      },
    });
  }

  async delete(workspaceId: string) {
    await this.db.workspace.deleteMany({
      where: {
        id: workspaceId,
      },
    });
    this.logger.log(`Deleted workspace ${workspaceId}`);
  }

  /**
   * Find the workspace ids that the user is a member of owner.
   */
  async findOwnedIds(userId: string) {
    const rows = await this.db.workspaceUserPermission.findMany({
      where: {
        userId,
        type: WorkspaceRole.Owner,
        OR: this.acceptedCondition,
      },
      select: {
        workspaceId: true,
      },
    });
    return rows.map(row => row.workspaceId);
  }

  /**
   * Find the accessible workspaces for the user.
   */
  async findAccessibleWorkspaces(userId: string) {
    return await this.db.workspaceUserPermission.findMany({
      where: {
        userId,
        OR: this.acceptedCondition,
      },
      include: {
        workspace: true,
      },
    });
  }

  // #endregion

  // #region workspace member and permission

  /**
   * Grant the workspace member with the given permission and status.
   */
  @Transactional()
  async grantMember(
    workspaceId: string,
    userId: string,
    permission: WorkspaceRole = WorkspaceRole.Collaborator,
    status: WorkspaceMemberStatus = WorkspaceMemberStatus.Pending
  ): Promise<WorkspaceUserPermission> {
    const data = await this.db.workspaceUserPermission.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!data) {
      // Create a new permission
      const created = await this.db.workspaceUserPermission.create({
        data: {
          workspaceId,
          userId,
          type: permission,
          status:
            permission === WorkspaceRole.Owner
              ? WorkspaceMemberStatus.Accepted
              : status,
        },
      });
      this.logger.log(
        `Granted workspace ${workspaceId} member ${userId} with permission ${WorkspaceRole[permission]}`
      );
      await this.notifyMembersUpdated(workspaceId);
      return created;
    }

    // If the user is already accepted and the new permission is owner, we need to revoke old owner
    if (data.status === WorkspaceMemberStatus.Accepted || data.accepted) {
      const updated = await this.db.workspaceUserPermission.update({
        where: {
          workspaceId_userId: { workspaceId, userId },
        },
        data: { type: permission },
      });
      // If the new permission is owner, we need to revoke old owner
      if (permission === WorkspaceRole.Owner) {
        await this.db.workspaceUserPermission.updateMany({
          where: {
            workspaceId,
            type: WorkspaceRole.Owner,
            userId: { not: userId },
          },
          data: { type: WorkspaceRole.Admin },
        });
        this.logger.log(
          `Change owner of workspace ${workspaceId} to ${userId}`
        );
      }
      return updated;
    }

    // If the user is not accepted, we can update the status directly
    const allowedStatus = this.getAllowedStatusSource(data.status);
    if (allowedStatus.includes(status)) {
      const updated = await this.db.workspaceUserPermission.update({
        where: { workspaceId_userId: { workspaceId, userId } },
        data: {
          status,
          // TODO(fengmk2): should we update the permission here?
          // type: permission,
        },
      });
      return updated;
    }

    // nothing to do
    return data;
  }

  /**
   * Get the workspace member invitation.
   */
  async getMemberInvitation(invitationId: string) {
    return await this.db.workspaceUserPermission.findUnique({
      where: {
        id: invitationId,
      },
    });
  }

  /**
   * Accept the workspace member invitation.
   * @param status: the status to update to, default to `Accepted`. Can be `Accepted` or `UnderReview`.
   */
  async acceptMemberInvitation(
    invitationId: string,
    workspaceId: string,
    status: WorkspaceMemberStatus = WorkspaceMemberStatus.Accepted
  ) {
    const { count } = await this.db.workspaceUserPermission.updateMany({
      where: {
        id: invitationId,
        workspaceId: workspaceId,
        // TODO(fengmk2): should we check the status here?
        AND: [{ accepted: false }, { status: WorkspaceMemberStatus.Pending }],
      },
      data: { accepted: true, status },
    });
    return count > 0;
  }

  /**
   * Get a workspace member in accepted status by workspace id and user id.
   */
  async getMember(workspaceId: string, userId: string) {
    return await this.db.workspaceUserPermission.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
        OR: this.acceptedCondition,
      },
    });
  }

  /**
   * Get a workspace member in any status by workspace id and user id.
   */
  async getMemberInAnyStatus(workspaceId: string, userId: string) {
    return await this.db.workspaceUserPermission.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });
  }

  /**
   * Returns whether a given user is a member of a workspace and has the given or higher permission.
   * Default to read permission.
   */
  async isMember(
    workspaceId: string,
    userId: string,
    permission: WorkspaceRole = WorkspaceRole.Collaborator
  ) {
    const count = await this.db.workspaceUserPermission.count({
      where: {
        workspaceId,
        userId,
        OR: this.acceptedCondition,
        type: {
          gte: permission,
        },
      },
    });
    return count > 0;
  }

  /**
   * Get the workspace owner.
   */
  async getOwner(workspaceId: string) {
    return await this.db.workspaceUserPermission.findFirst({
      where: {
        workspaceId,
        type: WorkspaceRole.Owner,
        OR: this.acceptedCondition,
      },
      include: {
        user: true,
      },
    });
  }

  /**
   * Find the workspace admins.
   */
  async findAdmins(workspaceId: string) {
    return await this.db.workspaceUserPermission.findMany({
      where: {
        workspaceId,
        type: WorkspaceRole.Admin,
        OR: this.acceptedCondition,
      },
      include: {
        user: true,
      },
    });
  }

  /**
   * Find the workspace members.
   */
  async findMembers(
    workspaceId: string,
    options: FindWorkspaceMembersOptions = {}
  ) {
    return await this.db.workspaceUserPermission.findMany({
      where: {
        workspaceId,
      },
      skip: options.skip,
      take: options.take || 8,
      orderBy: [{ createdAt: 'asc' }, { type: 'desc' }],
      include: {
        user: true,
      },
    });
  }

  /**
   * Delete a workspace member by workspace id and user id.
   * Except the owner, the owner can't be deleted.
   */
  async deleteMember(workspaceId: string, userId: string) {
    const member = await this.getMemberInAnyStatus(workspaceId, userId);

    // We shouldn't revoke owner permission
    // should auto deleted by workspace/user delete cascading
    if (!member || member.type === WorkspaceRole.Owner) {
      return false;
    }

    await this.db.workspaceUserPermission.deleteMany({
      where: {
        workspaceId,
        userId,
      },
    });
    this.logger.log(
      `Deleted workspace member ${userId} from workspace ${workspaceId}`
    );

    await this.notifyMembersUpdated(workspaceId);

    if (
      member.status === WorkspaceMemberStatus.UnderReview ||
      member.status === WorkspaceMemberStatus.NeedMoreSeatAndReview
    ) {
      this.event.emit('workspace.members.requestDeclined', {
        workspaceId,
        userId,
      });
    }

    return true;
  }

  private async notifyMembersUpdated(workspaceId: string) {
    const count = await this.getMemberTotalCount(workspaceId);
    this.event.emit('workspace.members.updated', {
      workspaceId,
      count,
    });
  }

  /**
   * Get the workspace member total count, including pending and accepted.
   */
  async getMemberTotalCount(workspaceId: string) {
    return await this.db.workspaceUserPermission.count({
      where: {
        workspaceId,
      },
    });
  }

  /**
   * Get the workspace member used count, only count the accepted member
   */
  async getMemberUsedCount(workspaceId: string) {
    return await this.db.workspaceUserPermission.count({
      where: {
        workspaceId,
        OR: this.acceptedCondition,
      },
    });
  }

  /**
   * Refresh the workspace member seat status.
   */
  @Transactional()
  async refreshMemberSeatStatus(workspaceId: string, memberLimit: number) {
    const usedCount = await this.getMemberUsedCount(workspaceId);
    const availableCount = memberLimit - usedCount;
    if (availableCount <= 0) {
      return;
    }

    const members = await this.db.workspaceUserPermission.findMany({
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
      // find the oldest members first
      orderBy: { createdAt: 'asc' },
    });

    const needChange = members.slice(0, availableCount);
    const groups = groupBy(needChange, m => m.status);

    const toPendings = groups.NeedMoreSeat;
    if (toPendings) {
      // NeedMoreSeat => Pending
      await this.db.workspaceUserPermission.updateMany({
        where: { id: { in: toPendings.map(m => m.id) } },
        data: { status: WorkspaceMemberStatus.Pending },
      });
    }

    const toUnderReviews = groups.NeedMoreSeatAndReview;
    if (toUnderReviews) {
      // NeedMoreSeatAndReview => UnderReview
      await this.db.workspaceUserPermission.updateMany({
        where: { id: { in: toUnderReviews.map(m => m.id) } },
        data: { status: WorkspaceMemberStatus.UnderReview },
      });
    }
  }

  /**
   * Accepted condition for workspace member.
   */
  private get acceptedCondition() {
    return [
      {
        // keep compatibility with old data
        accepted: true,
      },
      {
        status: WorkspaceMemberStatus.Accepted,
      },
    ];
  }

  /**
   * NeedMoreSeat => Pending
   *
   * NeedMoreSeatAndReview => UnderReview
   *
   * Pending | UnderReview => Accepted
   */
  private getAllowedStatusSource(
    to: WorkspaceMemberStatus
  ): WorkspaceMemberStatus[] {
    switch (to) {
      case WorkspaceMemberStatus.NeedMoreSeat:
        return [WorkspaceMemberStatus.Pending];
      case WorkspaceMemberStatus.NeedMoreSeatAndReview:
        return [WorkspaceMemberStatus.UnderReview];
      case WorkspaceMemberStatus.Pending:
      case WorkspaceMemberStatus.UnderReview: // need admin to review in team workspace
        return [WorkspaceMemberStatus.Accepted];
      default:
        return [];
    }
  }

  // #endregion
}
