import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getStreamAsBuffer } from 'get-stream';

import {
  Cache,
  MailService,
  OnEvent,
  URLHelper,
  UserNotFound,
} from '../../../base';
import { Models } from '../../../models';
import { DocContentService } from '../../doc-renderer';
import { PermissionService, WorkspaceRole } from '../../permission';
import { WorkspaceBlobStorage } from '../../storage';

export const defaultWorkspaceAvatar =
  'iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAQtSURBVHgBfVa9jhxFEK6q7rkf+4T2AgdIIC0ZoXkBuNQJtngBuIzs1hIRye1FhL438D0CRgKRGUeE6wwkhHYlkE2AtGdkbN/MdJe/qu7Z27PWnnG5Znq7v/rqd47pHddkNh/918tR1/FBamXc9zxOPVFKfJ4yP86qD1LD3/986/3F2zB40+LXv83HrHq/6+gAoNS1kF4odUz2nhJRTkI5E6mD6Bk1crLJkLy5cHc+P4ohzxLng8RKLqKUq6hkUtBSe8Zvdmfir7TT2a0fnkzeaeCbv/44ztSfZskjP2ygVRM0mbYTpgHMMMS8CsIIj/c+//Hp8UYD3z758whQUwdeEwPjAZQLqJhI0VxB2MVco+kXP/0zuZKD6dP5uM397ELzqEtMba/UJ4t7iXeq8U94z52Q+js09qjlIXMxAEsRDJpI59dVPzlDTooHko7BdlR2FcYmAtbGMmAt2mFI4yDQkIjtEQkxUAMKAPD9SiOK4b578N0S7Nt+fqFKbTbmRD1YGXurEmdtnjjz4kFuIV0gtWewV62hMHBY2gpEOw3Rnmztx9jnO72xzTV/YkzgNmgkiypeYJdCLjonqyAAg7VCshVpjTbD08HbxrySdhKxcDvoJTA5gLvpeXVQ+K340WKea9UkNeZVqGSba/IbF6athj+LUeRmRCyiAVnlAKhJJQfmugGZ28ZWna24RGzwNUNUqpWGf6HkajvAgNA4NsSjHgcb9obx+k5c3DUttcwd3NcHxpVurXQ2d4MZACGw9TwEHsdtbEwytL1xywAGcxavjoH1quLVywuGi+aBhFWexRilFSwK0QzgdUdkkVMeKw4wijrgxjzz2CefCRZn+21ViOWW4Ym9nNnyFLMbMS8ivNhGP8RdlgUojBkuBLDpEPi+5LpWiDURgFkKOIIckJTgN/sZ84KtKkKpDnsOZiTQ47jD4ZGwHghbw6AXIL3lo5Zg6Tp2AwIAyYJ8BRzGfmfPl6kI7HOLUdN2LIg+4IfL5SiFdvkK4blI6h50qda7jQI0CUMLdEhFIkqtQciMvXsgpaZ1pWtVUfrIa+TX5/8+RBcftAhTa91r8ycXA5ZxBqhAh2zgVagUAddxMkxfF/JxfvbpB+8d2jhBtsPhtuqsE0HJlhxYeHKdkCU8xUCos8dmkDdnGaOlJ1yy9dM52J2spqldvz9fTgB4z+aQd2kqjUY2KU2s4dTT7ezD0AqDAbvZiKF/VO9+fGPv9IoBu+b/P5ti6djDY+JlSg4ug1jc6fJbMAx9/3b4CNGTD/evT698D9avv188m4gKvko8MiMeJC3jmOvU9MSuHXZohAVpOrmxd+10HW/jR3/58uU45TRFt35ZR2XpY61DzW+tH3z/7xdM8sP93d3Fm1gbDawbEtU7CMtt/JVxEw01Kh7RAmoBE4+u7eycYv38bRivAZbdHBtPrwOHAAAAAElFTkSuQmCC';

export type InviteInfo = {
  workspaceId: string;
  inviterUserId?: string;
  inviteeUserId?: string;
};

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

  constructor(
    private readonly blobStorage: WorkspaceBlobStorage,
    private readonly cache: Cache,
    private readonly doc: DocContentService,
    private readonly mailer: MailService,
    private readonly permission: PermissionService,
    private readonly prisma: PrismaClient,
    private readonly models: Models,
    private readonly url: URLHelper
  ) {}

  async getInviteInfo(inviteId: string): Promise<InviteInfo> {
    // invite link
    const invite = await this.cache.get<InviteInfo>(
      `workspace:inviteLinkId:${inviteId}`
    );
    if (typeof invite?.workspaceId === 'string') {
      return invite;
    }

    return await this.prisma.workspaceUserPermission
      .findUniqueOrThrow({
        where: {
          id: inviteId,
        },
        select: {
          workspaceId: true,
          userId: true,
        },
      })
      .then(r => ({
        workspaceId: r.workspaceId,
        inviteeUserId: r.userId,
      }));
  }

  async getWorkspaceInfo(workspaceId: string) {
    const workspaceContent = await this.doc.getWorkspaceContent(workspaceId);

    let avatar = defaultWorkspaceAvatar;
    if (workspaceContent?.avatarKey) {
      const avatarBlob = await this.blobStorage.get(
        workspaceId,
        workspaceContent.avatarKey
      );

      if (avatarBlob.body) {
        avatar = (await getStreamAsBuffer(avatarBlob.body)).toString('base64');
      }
    }

    return {
      avatar,
      id: workspaceId,
      name: workspaceContent?.name ?? 'Untitled Workspace',
    };
  }

  private async getInviteeEmailTarget(inviteId: string) {
    const { workspaceId, inviteeUserId } = await this.getInviteInfo(inviteId);
    if (!inviteeUserId) {
      this.logger.error(`Invitee user not found for inviteId: ${inviteId}`);
      return;
    }
    const workspace = await this.getWorkspaceInfo(workspaceId);
    const invitee = await this.models.user.getPublicUser(inviteeUserId);
    if (!invitee) {
      this.logger.error(
        `Invitee user not found in workspace: ${workspaceId}, userId: ${inviteeUserId}`
      );
      return;
    }

    return {
      email: invitee.email,
      workspace,
    };
  }

  async sendAcceptedEmail(inviteId: string) {
    const { workspaceId, inviterUserId, inviteeUserId } =
      await this.getInviteInfo(inviteId);
    const workspace = await this.getWorkspaceInfo(workspaceId);
    const invitee = inviteeUserId
      ? await this.models.user.getPublicUser(inviteeUserId)
      : null;
    const inviter = inviterUserId
      ? await this.models.user.getPublicUser(inviterUserId)
      : await this.permission.getWorkspaceOwner(workspaceId);

    if (!inviter || !invitee) {
      this.logger.error(
        `Inviter or invitee user not found for inviteId: ${inviteId}`
      );
      return false;
    }

    await this.mailer.sendMemberAcceptedEmail(inviter.email, {
      user: invitee,
      workspace,
    });
    return true;
  }

  async sendInviteEmail(inviteId: string) {
    const target = await this.getInviteeEmailTarget(inviteId);

    if (!target) {
      return;
    }

    const owner = await this.permission.getWorkspaceOwner(target.workspace.id);

    await this.mailer.sendMemberInviteMail(target.email, {
      workspace: target.workspace,
      user: owner,
      url: this.url.link(`/invite/${inviteId}`),
    });
  }

  // ================ Team ================
  async isTeamWorkspace(workspaceId: string) {
    return this.models.workspaceFeature.has(workspaceId, 'team_plan_v1');
  }

  async sendTeamWorkspaceUpgradedEmail(workspaceId: string) {
    const workspace = await this.getWorkspaceInfo(workspaceId);
    const owner = await this.permission.getWorkspaceOwner(workspaceId);
    const admins = await this.permission.getWorkspaceAdmin(workspaceId);

    await this.mailer.sendTeamWorkspaceUpgradedEmail(owner.email, {
      workspace,
      isOwner: true,
      url: this.url.link(`/workspace/${workspaceId}`),
    });

    for (const user of admins) {
      await this.mailer.sendTeamWorkspaceUpgradedEmail(user.email, {
        workspace,
        isOwner: false,
        url: this.url.link(`/workspace/${workspaceId}`),
      });
    }
  }

  async sendReviewRequestedEmail(inviteId: string) {
    const { workspaceId, inviteeUserId } = await this.getInviteInfo(inviteId);
    if (!inviteeUserId) {
      this.logger.error(`Invitee user not found for inviteId: ${inviteId}`);
      return;
    }

    const invitee = await this.models.user.getPublicUser(inviteeUserId);
    if (!invitee) {
      this.logger.error(
        `Invitee user not found for inviteId: ${inviteId}, userId: ${inviteeUserId}`
      );
      return;
    }

    const workspace = await this.getWorkspaceInfo(workspaceId);
    const owner = await this.permission.getWorkspaceOwner(workspaceId);
    const admin = await this.permission.getWorkspaceAdmin(workspaceId);

    for (const user of [owner, ...admin]) {
      await this.mailer.sendLinkInvitationReviewRequestMail(user.email, {
        workspace,
        user: invitee,
        url: this.url.link(`/workspace/${workspace.id}`),
      });
    }
  }

  async sendReviewApproveEmail(inviteId: string) {
    const target = await this.getInviteeEmailTarget(inviteId);
    if (!target) return;

    await this.mailer.sendLinkInvitationApproveMail(target.email, {
      workspace: target.workspace,
      url: this.url.link(`/workspace/${target.workspace.id}`),
    });
  }

  async sendReviewDeclinedEmail(
    email: string | undefined,
    workspaceId: string
  ) {
    if (!email) return;

    const workspace = await this.getWorkspaceInfo(workspaceId);
    await this.mailer.sendLinkInvitationDeclineMail(email, {
      workspace,
    });
  }

  async sendRoleChangedEmail(
    userId: string,
    ws: { id: string; role: WorkspaceRole }
  ) {
    const user = await this.models.user.getPublicUser(userId);
    if (!user) throw new UserNotFound();

    const workspace = await this.getWorkspaceInfo(ws.id);

    if (ws.role === WorkspaceRole.Admin) {
      await this.mailer.sendTeamBecomeAdminMail(user.email, {
        workspace,
        url: this.url.link(`/workspace/${workspace.id}`),
      });
    } else {
      await this.mailer.sendTeamBecomeCollaboratorMail(user.email, {
        workspace,
        url: this.url.link(`/workspace/${workspace.id}`),
      });
    }
  }

  async sendOwnershipTransferredEmail(email: string, ws: { id: string }) {
    const workspace = await this.getWorkspaceInfo(ws.id);
    await this.mailer.sendOwnershipTransferredMail(email, { workspace });
  }

  async sendOwnershipReceivedEmail(email: string, ws: { id: string }) {
    const workspace = await this.getWorkspaceInfo(ws.id);
    await this.mailer.sendOwnershipReceivedMail(email, { workspace });
  }

  @OnEvent('workspace.members.leave')
  async onMemberLeave({
    user,
    workspaceId,
  }: Events['workspace.members.leave']) {
    const workspace = await this.getWorkspaceInfo(workspaceId);
    const owner = await this.permission.getWorkspaceOwner(workspaceId);
    await this.mailer.sendMemberLeaveEmail(owner.email, {
      workspace,
      user,
    });
  }

  @OnEvent('workspace.members.removed')
  async onMemberRemoved({
    userId,
    workspaceId,
  }: Events['workspace.members.requestDeclined']) {
    const user = await this.models.user.get(userId);
    if (!user) return;

    const workspace = await this.getWorkspaceInfo(workspaceId);
    await this.mailer.sendMemberRemovedMail(user.email, { workspace });
  }
}
