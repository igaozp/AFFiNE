export { DocsSearchService } from './services/docs-search';

import { type Framework } from '@toeverything/infra';

import {
  WorkspaceLocalState,
  WorkspaceScope,
  WorkspaceService,
} from '../workspace';
import { DocsIndexer } from './entities/docs-indexer';
import { DocsSearchService } from './services/docs-search';

export function configureDocsSearchModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(DocsSearchService, [WorkspaceService])
    .entity(DocsIndexer, [WorkspaceService, WorkspaceLocalState]);
}
