import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import {
  type WorkspacePage as Page,
  type WorkspacePageUserPermission as PageUserPermission,
} from '@prisma/client';

import { BaseModel } from './base';
import { Permission, PublicPageMode } from './common';

export type { Page };
export type UpdatePageInput = {
  mode?: PublicPageMode;
  public?: boolean;
};

@Injectable()
export class PageModel extends BaseModel {
  // #region page

  /**
   * Create or update the page.
   */
  async upsert(workspaceId: string, pageId: string, data?: UpdatePageInput) {
    return await this.db.workspacePage.upsert({
      where: {
        workspaceId_pageId: {
          workspaceId,
          pageId,
        },
      },
      update: {
        ...data,
      },
      create: {
        ...data,
        workspaceId,
        pageId,
      },
    });
  }

  /**
   * Get the page.
   * @param isPublic: if true, only return the public page. If false, only return the private page.
   * If not set, return public or private both.
   */
  async get(workspaceId: string, pageId: string, isPublic?: boolean) {
    return await this.db.workspacePage.findUnique({
      where: {
        workspaceId_pageId: {
          workspaceId,
          pageId,
        },
        public: isPublic,
      },
    });
  }

  /**
   * Find the workspace public pages.
   */
  async findPublics(workspaceId: string) {
    return await this.db.workspacePage.findMany({
      where: {
        workspaceId,
        public: true,
      },
    });
  }

  /**
   * Get the workspace public pages count.
   */
  async getPublicsCount(workspaceId: string) {
    return await this.db.workspacePage.count({
      where: {
        workspaceId,
        public: true,
      },
    });
  }

  // #endregion

  // #region page member and permission

  /**
   * Grant the page member with the given permission.
   */
  @Transactional()
  async grantMember(
    workspaceId: string,
    pageId: string,
    userId: string,
    permission: Permission = Permission.Read
  ): Promise<PageUserPermission> {
    let data = await this.db.workspacePageUserPermission.findUnique({
      where: {
        workspaceId_pageId_userId: {
          workspaceId,
          pageId,
          userId,
        },
      },
    });

    // If the user is already accepted and the new permission is owner, we need to revoke old owner
    if (!data || data.type !== permission) {
      if (data) {
        // Update the permission
        data = await this.db.workspacePageUserPermission.update({
          where: {
            workspaceId_pageId_userId: {
              workspaceId,
              pageId,
              userId,
            },
          },
          data: { type: permission },
        });
      } else {
        // Create a new permission
        data = await this.db.workspacePageUserPermission.create({
          data: {
            workspaceId,
            pageId,
            userId,
            type: permission,
            // page permission does not require invitee to accept, the accepted field will be deprecated later.
            accepted: true,
          },
        });
      }

      // If the new permission is owner, we need to revoke old owner
      if (permission === Permission.Owner) {
        await this.db.workspacePageUserPermission.updateMany({
          where: {
            workspaceId,
            pageId,
            type: Permission.Owner,
            userId: { not: userId },
          },
          data: { type: Permission.Admin },
        });
        this.logger.log(
          `Change owner of workspace ${workspaceId} page ${pageId} to user ${userId}`
        );
      }
      return data;
    }

    // nothing to do
    return data;
  }

  /**
   * Returns whether a given user is a member of a workspace and has the given or higher permission.
   * Default to read permission.
   */
  async isMember(
    workspaceId: string,
    pageId: string,
    userId: string,
    permission: Permission = Permission.Read
  ) {
    const count = await this.db.workspacePageUserPermission.count({
      where: {
        workspaceId,
        pageId,
        userId,
        type: {
          gte: permission,
        },
      },
    });
    return count > 0;
  }

  /**
   * Delete a page member
   * Except the owner, the owner can't be deleted.
   */
  async deleteMember(workspaceId: string, pageId: string, userId: string) {
    const { count } = await this.db.workspacePageUserPermission.deleteMany({
      where: {
        workspaceId,
        pageId,
        userId,
        type: {
          // We shouldn't revoke owner permission, should auto deleted by workspace/user delete cascading
          not: Permission.Owner,
        },
      },
    });
    return count;
  }

  // #endregion
}
