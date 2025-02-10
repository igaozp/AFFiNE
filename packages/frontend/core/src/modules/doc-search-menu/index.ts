import { type Framework } from '@toeverything/infra';

import { DocDisplayMetaService } from '../doc-display-meta';
import { DocsSearchService } from '../docs-search';
import { RecentDocsService } from '../quicksearch';
import { WorkspaceScope, WorkspaceService } from '../workspace';
import { DocSearchMenuService } from './services';

export function configDocSearchMenuModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(DocSearchMenuService, [
      WorkspaceService,
      DocDisplayMetaService,
      RecentDocsService,
      DocsSearchService,
    ]);
}
