import { toast } from '@affine/component';
import {
  pushGlobalLoadingEventAtom,
  resolveGlobalLoadingEventAtom,
} from '@affine/component/global-loading';
import { AIProvider } from '@affine/core/blocksuite/presets/ai';
import { SyncAwareness } from '@affine/core/components/affine/awareness';
import { useRegisterFindInPageCommands } from '@affine/core/components/hooks/affine/use-register-find-in-page-commands';
import { useRegisterWorkspaceCommands } from '@affine/core/components/hooks/use-register-workspace-commands';
import { OverCapacityNotification } from '@affine/core/components/over-capacity';
import { AINetworkSearchService } from '@affine/core/modules/ai-button/services/network-search';
import {
  EventSourceService,
  FetchService,
  GraphQLService,
} from '@affine/core/modules/cloud';
import {
  GlobalDialogService,
  WorkspaceDialogService,
} from '@affine/core/modules/dialogs';
import { DocsService } from '@affine/core/modules/doc';
import { EditorSettingService } from '@affine/core/modules/editor-setting';
import { useRegisterNavigationCommands } from '@affine/core/modules/navigation/view/use-register-navigation-commands';
import { QuickSearchContainer } from '@affine/core/modules/quicksearch';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { useI18n } from '@affine/i18n';
import track from '@affine/track';
import { type DocMode, ZipTransformer } from '@blocksuite/affine/blocks';
import {
  effect,
  fromPromise,
  onStart,
  throwIfAborted,
  useService,
  useServices,
} from '@toeverything/infra';
import { useSetAtom } from 'jotai';
import { useEffect } from 'react';
import {
  catchError,
  EMPTY,
  finalize,
  mergeMap,
  switchMap,
  timeout,
} from 'rxjs';

import { CopilotClient } from '../blocksuite/block-suite-editor/ai/copilot-client';
import { setupAIProvider } from '../blocksuite/block-suite-editor/ai/setup-provider';

/**
 * @deprecated just for legacy code, will be removed in the future
 */
export const WorkspaceSideEffects = () => {
  const t = useI18n();
  const pushGlobalLoadingEvent = useSetAtom(pushGlobalLoadingEventAtom);
  const resolveGlobalLoadingEvent = useSetAtom(resolveGlobalLoadingEventAtom);
  const { workspaceService, docsService } = useServices({
    WorkspaceService,
    DocsService,
    EditorSettingService,
  });
  const currentWorkspace = workspaceService.workspace;
  const docsList = docsService.list;

  const workbench = useService(WorkbenchService).workbench;
  useEffect(() => {
    const insertTemplate = effect(
      switchMap(({ template, mode }: { template: string; mode: string }) => {
        return fromPromise(async abort => {
          const templateZip = await fetch(template, { signal: abort });
          const templateBlob = await templateZip.blob();
          throwIfAborted(abort);
          const [doc] = await ZipTransformer.importDocs(
            currentWorkspace.docCollection,
            templateBlob
          );
          if (doc) {
            doc.resetHistory();
          }

          return { doc, mode };
        }).pipe(
          timeout(10000 /* 10s */),
          mergeMap(({ mode, doc }) => {
            if (doc) {
              docsList.setPrimaryMode(doc.id, mode as DocMode);
              workbench.openDoc(doc.id);
            }
            return EMPTY;
          }),
          onStart(() => {
            pushGlobalLoadingEvent({
              key: 'insert-template',
            });
          }),
          catchError(err => {
            console.error(err);
            toast(t['com.affine.ai.template-insert.failed']());
            return EMPTY;
          }),
          finalize(() => {
            resolveGlobalLoadingEvent('insert-template');
          })
        );
      })
    );

    const disposable = AIProvider.slots.requestInsertTemplate.on(
      ({ template, mode }) => {
        insertTemplate({ template, mode });
      }
    );

    return () => {
      disposable.dispose();
      insertTemplate.unsubscribe();
    };
  }, [
    currentWorkspace.docCollection,
    docsList,
    pushGlobalLoadingEvent,
    resolveGlobalLoadingEvent,
    t,
    workbench,
  ]);

  const workspaceDialogService = useService(WorkspaceDialogService);
  const globalDialogService = useService(GlobalDialogService);

  useEffect(() => {
    const disposable = AIProvider.slots.requestUpgradePlan.on(() => {
      workspaceDialogService.open('setting', {
        activeTab: 'billing',
      });
      track.$.paywall.aiAction.viewPlans();
    });
    return () => {
      disposable.dispose();
    };
  }, [workspaceDialogService]);

  const graphqlService = useService(GraphQLService);
  const eventSourceService = useService(EventSourceService);
  const fetchService = useService(FetchService);
  const networkSearchService = useService(AINetworkSearchService);

  useEffect(() => {
    const dispose = setupAIProvider(
      new CopilotClient(
        graphqlService.gql,
        fetchService.fetch,
        eventSourceService.eventSource
      ),
      globalDialogService,
      networkSearchService
    );
    return () => {
      dispose();
    };
  }, [
    eventSourceService,
    fetchService,
    workspaceDialogService,
    graphqlService,
    networkSearchService,
    globalDialogService,
  ]);

  useRegisterWorkspaceCommands();
  useRegisterNavigationCommands();
  useRegisterFindInPageCommands();

  return (
    <>
      <QuickSearchContainer />
      <SyncAwareness />
      <OverCapacityNotification />
    </>
  );
};
