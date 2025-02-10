import {
  type ElementOrFactory,
  Input,
  notify,
  toast,
  type ToastOptions,
  toReactNode,
  type useConfirmModal,
} from '@affine/component';
import { AIChatBlockSchema } from '@affine/core/blocksuite/blocks';
import { WorkspaceServerService } from '@affine/core/modules/cloud';
import { DesktopApiService } from '@affine/core/modules/desktop-api';
import { type DocService, DocsService } from '@affine/core/modules/doc';
import type { EditorService } from '@affine/core/modules/editor';
import { EditorSettingService } from '@affine/core/modules/editor-setting';
import { JournalService } from '@affine/core/modules/journal';
import { resolveLinkToDoc } from '@affine/core/modules/navigation';
import type { PeekViewService } from '@affine/core/modules/peek-view';
import {
  CreationQuickSearchSession,
  DocsQuickSearchSession,
  LinksQuickSearchSession,
  QuickSearchService,
  RecentDocsQuickSearchSession,
} from '@affine/core/modules/quicksearch';
import { ExternalLinksQuickSearchSession } from '@affine/core/modules/quicksearch/impls/external-links';
import { JournalsQuickSearchSession } from '@affine/core/modules/quicksearch/impls/journals';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { DebugLogger } from '@affine/debug';
import { I18n } from '@affine/i18n';
import { track } from '@affine/track';
import {
  BlockServiceWatcher,
  BlockViewIdentifier,
  ConfigIdentifier,
  type WidgetComponent,
} from '@blocksuite/affine/block-std';
import type {
  AffineReference,
  DocMode,
  DocModeProvider,
  OpenDocConfig,
  OpenDocConfigItem,
  PeekOptions,
  PeekViewService as BSPeekViewService,
  QuickSearchResult,
  RootBlockConfig,
} from '@blocksuite/affine/blocks';
import {
  AffineSlashMenuWidget,
  AttachmentEmbedConfigIdentifier,
  DocModeExtension,
  EdgelessRootBlockComponent,
  EmbedLinkedDocBlockComponent,
  GenerateDocUrlExtension,
  insertLinkByQuickSearchCommand,
  MobileSpecsPatches,
  NativeClipboardExtension,
  NoteConfigExtension,
  NotificationExtension,
  OpenDocExtension,
  ParseDocUrlExtension,
  PeekViewExtension,
  QuickSearchExtension,
  ReferenceNodeConfigExtension,
  SidebarExtension,
} from '@blocksuite/affine/blocks';
import { Bound } from '@blocksuite/affine/global/utils';
import {
  type BlockSnapshot,
  type ExtensionType,
  Text,
} from '@blocksuite/affine/store';
import type { ReferenceParams } from '@blocksuite/affine-model';
import {
  CenterPeekIcon,
  ExpandFullIcon,
  OpenInNewIcon,
  SplitViewIcon,
} from '@blocksuite/icons/lit';
import { type FrameworkProvider } from '@toeverything/infra';
import { html, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { literal } from 'lit/static-html.js';
import { pick } from 'lodash-es';

import type { DocProps } from '../../../../../blocksuite/initialization';
import { AttachmentEmbedPreview } from '../../../../attachment-viewer/pdf-viewer-embedded';
import { generateUrl } from '../../../../hooks/affine/use-share-url';
import { BlocksuiteEditorJournalDocTitle } from '../../journal-doc-title';
import { EdgelessNoteHeader } from './widgets/edgeless-note-header';
import { createKeyboardToolbarConfig } from './widgets/keyboard-toolbar';

export type ReferenceReactRenderer = (
  reference: AffineReference
) => React.ReactElement;

const logger = new DebugLogger('affine::spec-patchers');

function patchSpecService(
  flavour: string,
  onWidgetConnected?: (component: WidgetComponent) => void
) {
  class TempServiceWatcher extends BlockServiceWatcher {
    static override readonly flavour = flavour;
    override mounted() {
      super.mounted();
      const disposableGroup = this.blockService.disposables;
      if (onWidgetConnected) {
        disposableGroup.add(
          this.blockService.specSlots.widgetConnected.on(({ component }) => {
            onWidgetConnected(component);
          })
        );
      }
    }
  }
  return TempServiceWatcher;
}

/**
 * Patch the block specs with custom renderers.
 */
export function patchReferenceRenderer(
  reactToLit: (element: ElementOrFactory) => TemplateResult,
  reactRenderer: ReferenceReactRenderer
): ExtensionType {
  const customContent = (reference: AffineReference) => {
    const node = reactRenderer(reference);
    return reactToLit(node);
  };

  return ReferenceNodeConfigExtension({
    customContent,
  });
}

export function patchNotificationService({
  closeConfirmModal,
  openConfirmModal,
}: ReturnType<typeof useConfirmModal>) {
  return NotificationExtension({
    confirm: async ({ title, message, confirmText, cancelText, abort }) => {
      return new Promise<boolean>(resolve => {
        openConfirmModal({
          title: toReactNode(title),
          description: toReactNode(message),
          confirmText,
          confirmButtonOptions: {
            variant: 'primary',
          },
          cancelText,
          onConfirm: () => {
            resolve(true);
          },
          onCancel: () => {
            resolve(false);
          },
        });
        abort?.addEventListener('abort', () => {
          resolve(false);
          closeConfirmModal();
        });
      });
    },
    prompt: async ({
      title,
      message,
      confirmText,
      placeholder,
      cancelText,
      autofill,
      abort,
    }) => {
      return new Promise<string | null>(resolve => {
        let value = autofill || '';
        const description = (
          <div>
            <span style={{ marginBottom: 12 }}>{toReactNode(message)}</span>
            <Input
              autoSelect={true}
              placeholder={placeholder}
              defaultValue={value}
              onChange={e => (value = e)}
            />
          </div>
        );
        openConfirmModal({
          title: toReactNode(title),
          description: description,
          confirmText: confirmText ?? 'Confirm',
          confirmButtonOptions: {
            variant: 'primary',
          },
          cancelText: cancelText ?? 'Cancel',
          onConfirm: () => {
            resolve(value);
          },
          onCancel: () => {
            resolve(null);
          },
          autoFocusConfirm: false,
        });
        abort?.addEventListener('abort', () => {
          resolve(null);
          closeConfirmModal();
        });
      });
    },
    toast: (message: string, options: ToastOptions) => {
      return toast(message, options);
    },
    notify: notification => {
      const accentToNotify = {
        error: notify.error,
        success: notify.success,
        warning: notify.warning,
        info: notify,
      };

      const fn = accentToNotify[notification.accent || 'info'];
      if (!fn) {
        throw new Error('Invalid notification accent');
      }

      const toastId = fn(
        {
          title: toReactNode(notification.title),
          message: toReactNode(notification.message),
          footer: toReactNode(notification.footer),
          action: notification.action?.onClick
            ? {
                label: toReactNode(notification.action?.label),
                onClick: notification.action.onClick,
              }
            : undefined,
          onDismiss: notification.onClose,
        },
        {
          duration: notification.duration || 0,
          onDismiss: notification.onClose,
          onAutoClose: notification.onClose,
        }
      );

      notification.abort?.addEventListener('abort', () => {
        notify.dismiss(toastId);
      });
    },
  });
}

export function patchOpenDocExtension() {
  const openDocConfig: OpenDocConfig = {
    items: [
      {
        type: 'open-in-active-view',
        label: I18n['com.affine.peek-view-controls.open-doc'](),
        icon: ExpandFullIcon(),
      },
      BUILD_CONFIG.isElectron
        ? {
            type: 'open-in-new-view',
            label:
              I18n['com.affine.peek-view-controls.open-doc-in-split-view'](),
            icon: SplitViewIcon(),
          }
        : null,
      {
        type: 'open-in-new-tab',
        label: I18n['com.affine.peek-view-controls.open-doc-in-new-tab'](),
        icon: OpenInNewIcon(),
      },
      {
        type: 'open-in-center-peek',
        label: I18n['com.affine.peek-view-controls.open-doc-in-center-peek'](),
        icon: CenterPeekIcon(),
      },
    ].filter((item): item is OpenDocConfigItem => item !== null),
  };
  return OpenDocExtension(openDocConfig);
}

export function patchPeekViewService(service: PeekViewService) {
  return PeekViewExtension({
    peek: (
      element: {
        target: HTMLElement;
        docId: string;
        blockIds?: string[];
        template?: TemplateResult;
      },
      options?: PeekOptions
    ) => {
      logger.debug('center peek', element);
      const { template, target, ...props } = element;

      return service.peekView.open(
        {
          element: target,
          docRef: props,
        },
        template,
        options?.abortSignal
      );
    },
  } satisfies BSPeekViewService);
}

export function patchDocModeService(
  docService: DocService,
  docsService: DocsService,
  editorService: EditorService
): ExtensionType {
  const DEFAULT_MODE = 'page';
  class AffineDocModeService implements DocModeProvider {
    setEditorMode = (mode: DocMode) => {
      editorService.editor.setMode(mode);
    };
    getEditorMode = () => {
      return editorService.editor.mode$.value;
    };
    setPrimaryMode = (mode: DocMode, id?: string) => {
      if (id) {
        docsService.list.setPrimaryMode(id, mode);
      } else {
        docService.doc.setPrimaryMode(mode);
      }
    };
    getPrimaryMode = (id?: string) => {
      const mode = id
        ? docsService.list.getPrimaryMode(id)
        : docService.doc.getPrimaryMode();
      return (mode || DEFAULT_MODE) as DocMode;
    };
    togglePrimaryMode = (id?: string) => {
      const mode = id
        ? docsService.list.togglePrimaryMode(id)
        : docService.doc.togglePrimaryMode();
      return (mode || DEFAULT_MODE) as DocMode;
    };
    onPrimaryModeChange = (handler: (mode: DocMode) => void, id?: string) => {
      const mode$ = id
        ? docsService.list.primaryMode$(id)
        : docService.doc.primaryMode$;
      const sub = mode$.subscribe(m => handler((m || DEFAULT_MODE) as DocMode));
      return {
        dispose: sub.unsubscribe,
      };
    };
  }

  const docModeExtension = DocModeExtension(new AffineDocModeService());

  return docModeExtension;
}

export function patchQuickSearchService(framework: FrameworkProvider) {
  const QuickSearch = QuickSearchExtension({
    async openQuickSearch() {
      let searchResult: QuickSearchResult = null;
      searchResult = await new Promise((resolve, reject) =>
        framework.get(QuickSearchService).quickSearch.show(
          [
            framework.get(RecentDocsQuickSearchSession),
            framework.get(CreationQuickSearchSession),
            framework.get(DocsQuickSearchSession),
            framework.get(LinksQuickSearchSession),
            framework.get(ExternalLinksQuickSearchSession),
            framework.get(JournalsQuickSearchSession),
          ],
          result => {
            if (result === null) {
              resolve(null);
              return;
            }

            if (result.source === 'docs') {
              resolve({
                docId: result.payload.docId,
              });
              return;
            }

            if (result.source === 'recent-doc') {
              resolve({
                docId: result.payload.docId,
              });
              return;
            }

            if (result.source === 'link') {
              resolve({
                docId: result.payload.docId,
                params: pick(result.payload, [
                  'mode',
                  'blockIds',
                  'elementIds',
                ]),
              });
              return;
            }

            if (result.source === 'date-picker') {
              result.payload
                .getDocId()
                .then(docId => {
                  if (docId) {
                    resolve({ docId });
                  }
                })
                .catch(reject);
              return;
            }

            if (result.source === 'external-link') {
              const externalUrl = result.payload.url;
              resolve({ externalUrl });
              return;
            }

            if (result.source === 'creation') {
              const docsService = framework.get(DocsService);
              const editorSettingService = framework.get(EditorSettingService);
              const mode =
                result.id === 'creation:create-edgeless' ? 'edgeless' : 'page';
              const docProps: DocProps = {
                page: { title: new Text(result.payload.title) },
                note: editorSettingService.editorSetting.get('affine:note'),
              };
              const newDoc = docsService.createDoc({
                primaryMode: mode,
                docProps,
              });

              resolve({ docId: newDoc.id });
              return;
            }
          },
          {
            label: {
              i18nKey: 'com.affine.cmdk.insert-links',
            },
            placeholder: {
              i18nKey: 'com.affine.cmdk.docs.placeholder',
            },
          }
        )
      );

      return searchResult;
    },
  });

  const SlashMenuQuickSearchExtension = patchSpecService(
    'affine:page',
    (component: WidgetComponent) => {
      if (component instanceof AffineSlashMenuWidget) {
        component.config.items.forEach(item => {
          if (
            'action' in item &&
            (item.name === 'Linked Doc' || item.name === 'Link')
          ) {
            item.action = async ({ rootComponent }) => {
              const [success, { insertedLinkType }] =
                rootComponent.std.command.exec(insertLinkByQuickSearchCommand);

              if (!success) return;

              insertedLinkType
                ?.then(type => {
                  const flavour = type?.flavour;
                  if (!flavour) return;

                  if (flavour === 'affine:bookmark') {
                    track.doc.editor.slashMenu.bookmark();
                    return;
                  }

                  if (flavour === 'affine:embed-linked-doc') {
                    track.doc.editor.slashMenu.linkDoc({
                      control: 'linkDoc',
                    });
                    return;
                  }
                })
                .catch(console.error);
            };
          }
        });
      }
    }
  );
  return [QuickSearch, SlashMenuQuickSearchExtension];
}

export function patchParseDocUrlExtension(framework: FrameworkProvider) {
  const workspaceService = framework.get(WorkspaceService);
  const ParseDocUrl = ParseDocUrlExtension({
    parseDocUrl(url) {
      const info = resolveLinkToDoc(url);
      if (!info || info.workspaceId !== workspaceService.workspace.id) return;

      delete info.refreshKey;

      return info;
    },
  });

  return [ParseDocUrl];
}

export function patchGenerateDocUrlExtension(framework: FrameworkProvider) {
  const workspaceService = framework.get(WorkspaceService);
  const workspaceServerService = framework.get(WorkspaceServerService);
  const GenerateDocUrl = GenerateDocUrlExtension({
    generateDocUrl(pageId: string, params?: ReferenceParams) {
      return generateUrl({
        ...params,
        pageId,
        workspaceId: workspaceService.workspace.id,
        baseUrl: workspaceServerService.server?.baseUrl ?? location.origin,
      });
    },
  });

  return [GenerateDocUrl];
}

export function patchEdgelessClipboard() {
  class EdgelessClipboardWatcher extends BlockServiceWatcher {
    static override readonly flavour = 'affine:page';

    override mounted() {
      super.mounted();
      this.blockService.disposables.add(
        this.blockService.specSlots.viewConnected.on(view => {
          const { component } = view;
          if (component instanceof EdgelessRootBlockComponent) {
            const AIChatBlockFlavour = AIChatBlockSchema.model.flavour;
            const createFunc = (block: BlockSnapshot) => {
              const {
                xywh,
                scale,
                messages,
                sessionId,
                rootDocId,
                rootWorkspaceId,
              } = block.props;
              const blockId = component.service.crud.addBlock(
                AIChatBlockFlavour,
                {
                  xywh,
                  scale,
                  messages,
                  sessionId,
                  rootDocId,
                  rootWorkspaceId,
                },
                component.surface.model.id
              );
              return blockId;
            };
            component.clipboardController.registerBlock(
              AIChatBlockFlavour,
              createFunc
            );
          }
        })
      );
    }
  }

  return EdgelessClipboardWatcher;
}

@customElement('affine-linked-doc-ref-block')
export class LinkedDocBlockComponent extends EmbedLinkedDocBlockComponent {
  override getInitialState() {
    return {
      loading: false,
      isBannerEmpty: true,
    };
  }
}

export function patchForSharedPage() {
  const extension: ExtensionType = {
    setup: di => {
      di.override(
        BlockViewIdentifier('affine:embed-linked-doc'),
        () => literal`affine-linked-doc-ref-block`
      );
      di.override(
        BlockViewIdentifier('affine:embed-synced-doc'),
        () => literal`affine-linked-doc-ref-block`
      );
    },
  };
  return extension;
}

export function patchForMobile() {
  const extensions: ExtensionType[] = [
    {
      setup: di => {
        const pageConfigIdentifier = ConfigIdentifier('affine:page');
        const prev = di.getFactory(pageConfigIdentifier);

        di.override(pageConfigIdentifier, provider => {
          return {
            ...prev?.(provider),
            keyboardToolbar: createKeyboardToolbarConfig(),
          } satisfies RootBlockConfig;
        });
      },
    },
    MobileSpecsPatches,
  ];
  return extensions;
}

export function patchForAttachmentEmbedViews(
  reactToLit: (
    element: ElementOrFactory,
    rerendering?: boolean
  ) => TemplateResult
): ExtensionType {
  return {
    setup: di => {
      di.override(AttachmentEmbedConfigIdentifier('pdf'), () => ({
        name: 'pdf',
        check: (model, maxFileSize) =>
          model.type === 'application/pdf' && model.size <= maxFileSize,
        action: model => {
          const bound = Bound.deserialize(model.xywh);
          bound.w = 537 + 24 + 2;
          bound.h = 759 + 46 + 24 + 2;
          model.doc.updateBlock(model, {
            embed: true,
            style: 'pdf',
            xywh: bound.serialize(),
          });
        },
        template: (model, _blobUrl) =>
          reactToLit(<AttachmentEmbedPreview model={model} />, false),
      }));
    },
  };
}

export function patchForClipboardInElectron(framework: FrameworkProvider) {
  const desktopApi = framework.get(DesktopApiService);
  return NativeClipboardExtension({
    copyAsPNG: desktopApi.handler.clipboard.copyAsPNG,
  });
}

export function patchForEdgelessNoteConfig(
  framework: FrameworkProvider,
  reactToLit: (element: ElementOrFactory) => TemplateResult
) {
  return NoteConfigExtension({
    edgelessNoteHeader: ({ note }) =>
      reactToLit(<EdgelessNoteHeader note={note} />),
    pageBlockTitle: ({ note }) => {
      const journalService = framework.get(JournalService);
      const isJournal = !!journalService.journalDate$(note.doc.id).value;
      if (isJournal) {
        return reactToLit(<BlocksuiteEditorJournalDocTitle page={note.doc} />);
      } else {
        return html`<doc-title .doc=${note.doc}></doc-title>`;
      }
    },
  });
}

export function patchSideBarService(framework: FrameworkProvider) {
  const { workbench } = framework.get(WorkbenchService);

  return SidebarExtension({
    open: (tabId?: string) => {
      workbench.openSidebar();
      workbench.activeView$.value.activeSidebarTab(tabId ?? null);
    },
    close: () => {
      workbench.closeSidebar();
    },
    getTabIds: () => {
      return workbench.activeView$.value.sidebarTabs$.value.map(tab => tab.id);
    },
  });
}
