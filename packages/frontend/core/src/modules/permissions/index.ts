export type { Member } from './entities/members';
export { WorkspaceMembersService } from './services/members';
export { WorkspacePermissionService } from './services/permission';

import { type Framework } from '@toeverything/infra';

import { WorkspaceServerService } from '../cloud';
import {
  WorkspaceScope,
  WorkspaceService,
  WorkspacesService,
} from '../workspace';
import { WorkspaceMembers } from './entities/members';
import { WorkspacePermission } from './entities/permission';
import { WorkspaceMembersService } from './services/members';
import { WorkspacePermissionService } from './services/permission';
import { WorkspaceMembersStore } from './stores/members';
import { WorkspacePermissionStore } from './stores/permission';

export function configurePermissionsModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(WorkspacePermissionService, [
      WorkspaceService,
      WorkspacesService,
      WorkspacePermissionStore,
    ])
    .store(WorkspacePermissionStore, [WorkspaceServerService])
    .entity(WorkspacePermission, [WorkspaceService, WorkspacePermissionStore])
    .service(WorkspaceMembersService, [WorkspaceMembersStore, WorkspaceService])
    .store(WorkspaceMembersStore, [WorkspaceServerService])
    .entity(WorkspaceMembers, [WorkspaceMembersStore, WorkspaceService]);
}
