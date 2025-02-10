import { Module } from '@nestjs/common';

import { PermissionService } from './service';

@Module({
  providers: [PermissionService],
  exports: [PermissionService],
})
export class PermissionModule {}

export { PermissionService } from './service';
export {
  DOC_ACTIONS,
  type DocAction,
  DocRole,
  fixupDocRole,
  mapDocRoleToPermissions,
  mapWorkspaceRoleToPermissions,
  PublicDocMode,
  WORKSPACE_ACTIONS,
  type WorkspaceAction,
  WorkspaceRole,
} from './types';
