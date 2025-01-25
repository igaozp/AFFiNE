import type { WorkspaceServerService } from '@affine/core/modules/cloud';
import { getWorkspaceInfoQuery, leaveWorkspaceMutation } from '@affine/graphql';
import { Store } from '@toeverything/infra';

export class WorkspacePermissionStore extends Store {
  constructor(private readonly workspaceServerService: WorkspaceServerService) {
    super();
  }

  async fetchWorkspaceInfo(workspaceId: string, signal?: AbortSignal) {
    if (!this.workspaceServerService.server) {
      throw new Error('No Server');
    }
    const info = await this.workspaceServerService.server.gql({
      query: getWorkspaceInfoQuery,
      variables: {
        workspaceId,
      },
      context: { signal },
    });

    return info;
  }

  /**
   * @param workspaceName for send email
   */
  async leaveWorkspace(workspaceId: string) {
    if (!this.workspaceServerService.server) {
      throw new Error('No Server');
    }
    await this.workspaceServerService.server.gql({
      query: leaveWorkspaceMutation,
      variables: {
        workspaceId,
      },
    });
  }
}
