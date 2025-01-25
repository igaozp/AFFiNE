import { fuzzyMatch } from '@affine/core/utils/fuzzy-match';
import { I18n } from '@affine/i18n';
import type {
  LinkedMenuGroup,
  LinkedMenuItem,
} from '@blocksuite/affine/blocks';
import { createSignalFromObservable } from '@blocksuite/affine/blocks';
import type { DocMeta } from '@blocksuite/affine/store';
import { computed } from '@preact/signals-core';
import { Service } from '@toeverything/infra';
import { cssVarV2 } from '@toeverything/theme/v2';
import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { map } from 'rxjs';

import type { DocDisplayMetaService } from '../../doc-display-meta';
import type { DocsSearchService } from '../../docs-search';
import type { RecentDocsService } from '../../quicksearch';
import type { WorkspaceService } from '../../workspace';

const MAX_DOCS = 3;

type DocMetaWithHighlights = DocMeta & {
  highlights?: string;
};

export type SearchDocMenuAction = (meta: DocMeta) => Promise<void> | void;

export class DocSearchMenuService extends Service {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly docDisplayMetaService: DocDisplayMetaService,
    private readonly recentDocsService: RecentDocsService,
    private readonly docsSearch: DocsSearchService
  ) {
    super();
  }

  getDocMenuGroup(
    query: string,
    action: SearchDocMenuAction,
    abortSignal: AbortSignal
  ): LinkedMenuGroup {
    const showRecent = query.trim().length === 0;
    if (showRecent) {
      return this.getRecentDocMenuGroup(action);
    } else {
      return this.getSearchDocMenuGroup(query, action, abortSignal);
    }
  }

  private getRecentDocMenuGroup(action: SearchDocMenuAction): LinkedMenuGroup {
    const currentWorkspace = this.workspaceService.workspace;
    const rawMetas = currentWorkspace.docCollection.meta.docMetas;
    const recentDocs = this.recentDocsService.getRecentDocs();
    return {
      name: I18n.t('com.affine.editor.at-menu.recent-docs'),
      items: recentDocs
        .map(doc => {
          const meta = rawMetas.find(meta => meta.id === doc.id);
          if (!meta) {
            return null;
          }
          return this.toDocMenuItem(meta, action);
        })
        .filter(m => !!m),
    };
  }

  private getSearchDocMenuGroup(
    query: string,
    action: SearchDocMenuAction,
    abortSignal: AbortSignal
  ): LinkedMenuGroup {
    const currentWorkspace = this.workspaceService.workspace;
    const rawMetas = currentWorkspace.docCollection.meta.docMetas;
    const { signal: docsSignal, cleanup: cleanupDocs } =
      createSignalFromObservable(
        this.searchDocs$(query).pipe(
          map(result => {
            const docs = result
              .map(doc => {
                const meta = rawMetas.find(meta => meta.id === doc.id);
                if (!meta) {
                  return null;
                }
                const highlights =
                  'highlights' in doc ? doc.highlights : undefined;
                return this.toDocMenuItem(
                  {
                    ...meta,
                    highlights,
                  },
                  action,
                  query
                );
              })
              .filter(m => !!m);
            return docs;
          })
        ),
        []
      );

    const { signal: isIndexerLoading, cleanup: cleanupIndexerLoading } =
      createSignalFromObservable(
        this.docsSearch.indexer.status$.pipe(
          map(status => status.remaining !== undefined && status.remaining > 0)
        ),
        false
      );

    const overflowText = computed(() => {
      const overflowCount = docsSignal.value.length - MAX_DOCS;
      return I18n.t('com.affine.editor.at-menu.more-docs-hint', {
        count: overflowCount > 100 ? '100+' : overflowCount,
      });
    });

    abortSignal.addEventListener('abort', () => {
      cleanupDocs();
      cleanupIndexerLoading();
    });

    return {
      name: I18n.t('com.affine.editor.at-menu.link-to-doc', {
        query,
      }),
      loading: isIndexerLoading,
      loadingText: I18n.t('com.affine.editor.at-menu.loading'),
      items: docsSignal,
      maxDisplay: MAX_DOCS,
      overflowText,
    };
  }

  // only search docs by title, excluding blocks
  private searchDocs$(query: string) {
    return this.docsSearch.indexer.docIndex
      .aggregate$(
        {
          type: 'boolean',
          occur: 'must',
          queries: [
            {
              type: 'match',
              field: 'title',
              match: query,
            },
          ],
        },
        'docId',
        {
          hits: {
            fields: ['docId', 'title'],
            pagination: {
              limit: 1,
            },
            highlights: [
              {
                field: 'title',
                before: `<span style="color: ${cssVarV2('text/emphasis')}">`,
                end: '</span>',
              },
            ],
          },
        }
      )
      .pipe(
        map(({ buckets }) =>
          buckets.map(bucket => {
            return {
              id: bucket.key,
              title: bucket.hits.nodes[0].fields.title,
              highlights: bucket.hits.nodes[0].highlights.title[0],
            };
          })
        )
      );
  }

  private toDocMenuItem(
    meta: DocMetaWithHighlights,
    action: SearchDocMenuAction,
    query?: string
  ): LinkedMenuItem | null {
    const title = this.docDisplayMetaService.title$(meta.id, {
      reference: true,
    }).value;

    if (meta.trash) {
      return null;
    }

    if (query && !fuzzyMatch(title, query)) {
      return null;
    }

    return {
      name: meta.highlights ? html`${unsafeHTML(meta.highlights)}` : title,
      key: meta.id,
      icon: this.docDisplayMetaService
        .icon$(meta.id, {
          type: 'lit',
          reference: true,
        })
        .value(),
      action: async () => {
        await action(meta);
      },
    };
  }
}
