import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import {
  type WorkspaceDoc as Page,
  type WorkspaceDocUserPermission as PageUserPermission,
} from '@prisma/client';

import { WorkspaceRole } from '../core/permission';
import { BaseModel } from './base';
import { PublicPageMode } from './common';
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
  async upsert(workspaceId: string, docId: string, data?: UpdatePageInput) {
    return await this.db.workspaceDoc.upsert({
      where: {
        workspaceId_docId: {
          workspaceId,
          docId,
        },
      },
      update: {
        ...data,
      },
      create: {
        ...data,
        workspaceId,
        docId,
      },
    });
  }

  /**
   * Get the page.
   * @param isPublic: if true, only return the public page. If false, only return the private page.
   * If not set, return public or private both.
   */
  async get(workspaceId: string, docId: string, isPublic?: boolean) {
    return await this.db.workspaceDoc.findUnique({
      where: {
        workspaceId_docId: {
          workspaceId,
          docId,
        },
        public: isPublic,
      },
    });
  }

  /**
   * Find the workspace public pages.
   */
  async findPublics(workspaceId: string) {
    return await this.db.workspaceDoc.findMany({
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
    return await this.db.workspaceDoc.count({
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
    docId: string,
    userId: string,
    permission: WorkspaceRole = WorkspaceRole.Collaborator
  ): Promise<PageUserPermission> {
    let data = await this.db.workspaceDocUserPermission.findUnique({
      where: {
        workspaceId_docId_userId: {
          workspaceId,
          docId,
          userId,
        },
      },
    });

    // If the user is already accepted and the new permission is owner, we need to revoke old owner
    if (!data || data.type !== permission) {
      if (data) {
        // Update the permission
        data = await this.db.workspaceDocUserPermission.update({
          where: {
            workspaceId_docId_userId: {
              workspaceId,
              docId,
              userId,
            },
          },
          data: { type: permission },
        });
      } else {
        // Create a new permission
        data = await this.db.workspaceDocUserPermission.create({
          data: {
            workspaceId,
            docId,
            userId,
            type: permission,
          },
        });
      }

      // If the new permission is owner, we need to revoke old owner
      if (permission === WorkspaceRole.Owner) {
        await this.db.workspaceDocUserPermission.updateMany({
          where: {
            workspaceId,
            docId,
            type: WorkspaceRole.Owner,
            userId: { not: userId },
          },
          data: { type: WorkspaceRole.Admin },
        });
        this.logger.log(
          `Change owner of workspace ${workspaceId} doc ${docId} to user ${userId}`
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
    docId: string,
    userId: string,
    permission: WorkspaceRole = WorkspaceRole.Collaborator
  ) {
    const count = await this.db.workspaceDocUserPermission.count({
      where: {
        workspaceId,
        docId,
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
  async deleteMember(workspaceId: string, docId: string, userId: string) {
    const { count } = await this.db.workspaceDocUserPermission.deleteMany({
      where: {
        workspaceId,
        docId,
        userId,
        type: {
          // We shouldn't revoke owner permission, should auto deleted by workspace/user delete cascading
          not: WorkspaceRole.Owner,
        },
      },
    });
    return count;
  }

  // #endregion
}
