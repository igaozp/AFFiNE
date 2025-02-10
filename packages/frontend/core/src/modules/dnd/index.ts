import { type Framework } from '@toeverything/infra';

import { DocsService } from '../doc';
import { WorkspaceScope, WorkspaceService } from '../workspace';
import { DndService } from './services';

export function configureDndModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(DndService, [DocsService, WorkspaceService]);
}
