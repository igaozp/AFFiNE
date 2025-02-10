import { I18n, i18nTime } from '@affine/i18n';
import track from '@affine/track';
import type { EditorHost } from '@blocksuite/affine/block-std';
import {
  type AffineInlineEditor,
  type DocMode,
  type LinkedMenuGroup,
  type LinkedMenuItem,
  type LinkedWidgetConfig,
  LinkedWidgetUtils,
} from '@blocksuite/affine/blocks';
import type { DocMeta } from '@blocksuite/affine/store';
import { Text } from '@blocksuite/affine/store';
import {
  DateTimeIcon,
  NewXxxEdgelessIcon,
  NewXxxPageIcon,
} from '@blocksuite/icons/lit';
import { computed, Signal } from '@preact/signals-core';
import { Service } from '@toeverything/infra';
import { cssVarV2 } from '@toeverything/theme/v2';
import { html } from 'lit';

import type { WorkspaceDialogService } from '../../dialogs';
import type { DocsService } from '../../doc';
import type { DocDisplayMetaService } from '../../doc-display-meta';
import type { DocSearchMenuService } from '../../doc-search-menu/services';
import type { EditorSettingService } from '../../editor-setting';
import { type JournalService, suggestJournalDate } from '../../journal';

function resolveSignal<T>(data: T | Signal<T>): T {
  return data instanceof Signal ? data.value : data;
}

export class AtMenuConfigService extends Service {
  constructor(
    private readonly journalService: JournalService,
    private readonly docDisplayMetaService: DocDisplayMetaService,
    private readonly dialogService: WorkspaceDialogService,
    private readonly editorSettingService: EditorSettingService,
    private readonly docsService: DocsService,
    private readonly docsSearchMenuService: DocSearchMenuService
  ) {
    super();
  }

  // todo(@peng17): maybe refactor the config using entity, so that each config
  // can be reactive to the query, instead of recreating the whole config?
  getConfig(): Partial<LinkedWidgetConfig> {
    return {
      getMenus: this.getMenusFn(),
      mobile: this.getMobileConfig(),
      autoFocusedItem: this.autoFocusedItem,
    };
  }

  private insertDoc(inlineEditor: AffineInlineEditor, id: string) {
    LinkedWidgetUtils.insertLinkedNode({
      inlineEditor,
      docId: id,
    });
  }

  private readonly autoFocusedItem = (
    menus: LinkedMenuGroup[],
    query: string
  ): LinkedMenuItem | null => {
    if (query.trim().length === 0) {
      return null;
    }
    // if the second group (linkToDocGroup) is EMPTY,
    // if the query is NOT empty && the second group (linkToDocGroup) is EMPTY,
    // we will focus on the first item of the third group (create), which is the "New Doc" item.
    if (resolveSignal(menus[1].items).length === 0) {
      return resolveSignal(menus[2].items)[0];
    }
    return null;
  };

  private newDocMenuGroup(
    query: string,
    close: () => void,
    editorHost: EditorHost,
    inlineEditor: AffineInlineEditor
  ): LinkedMenuGroup {
    const originalNewDocMenuGroup = LinkedWidgetUtils.createNewDocMenuGroup(
      query,
      close,
      editorHost,
      inlineEditor
    );

    // Patch the import item, to use the custom import dialog.
    const items = Array.isArray(originalNewDocMenuGroup.items)
      ? originalNewDocMenuGroup.items
      : originalNewDocMenuGroup.items.value;

    const newDocItem = items.find(item => item.key === 'create');
    const importItem = items.find(item => item.key === 'import');

    // should have both new doc and import item
    if (!newDocItem || !importItem) {
      return originalNewDocMenuGroup;
    }

    const createPage = (mode: DocMode) => {
      const page = this.docsService.createDoc({
        docProps: {
          note: this.editorSettingService.editorSetting.get('affine:note'),
          page: { title: new Text(query) },
        },
        primaryMode: mode,
      });

      return page;
    };

    const customNewDocItems: LinkedMenuItem[] = [
      {
        key: 'create-page',
        icon: NewXxxPageIcon(),
        name: I18n.t('com.affine.editor.at-menu.create-page', {
          name: query || I18n.t('Untitled'),
        }),
        action: () => {
          close();
          const page = createPage('page');
          this.insertDoc(inlineEditor, page.id);
          track.doc.editor.atMenu.createDoc({
            mode: 'page',
          });
        },
      },
      {
        key: 'create-edgeless',
        icon: NewXxxEdgelessIcon(),
        name: I18n.t('com.affine.editor.at-menu.create-edgeless', {
          name: query || I18n.t('Untitled'),
        }),
        action: () => {
          close();
          const page = createPage('edgeless');
          this.insertDoc(inlineEditor, page.id);
          track.doc.editor.atMenu.createDoc({
            mode: 'edgeless',
          });
        },
      },
    ];
    const customImportItem: LinkedMenuItem = {
      ...importItem,
      name: I18n.t('com.affine.editor.at-menu.import'),
      action: () => {
        close();
        track.doc.editor.atMenu.import();
        this.dialogService.open('import', undefined, payload => {
          if (!payload) {
            return;
          }

          // If the imported file is a workspace file, insert the entry page node.
          const { docIds, entryId, isWorkspaceFile } = payload;
          if (isWorkspaceFile && entryId) {
            this.insertDoc(inlineEditor, entryId);
            return;
          }

          // Otherwise, insert all the doc nodes.
          for (const docId of docIds) {
            this.insertDoc(inlineEditor, docId);
          }
        });
      },
    };

    return {
      ...originalNewDocMenuGroup,
      name: I18n.t('com.affine.editor.at-menu.new-doc'),
      items: [...customNewDocItems, customImportItem],
    };
  }

  private journalGroup(
    query: string,
    close: () => void,
    inlineEditor: AffineInlineEditor
  ): LinkedMenuGroup {
    const suggestedDate = suggestJournalDate(query);

    const items: LinkedMenuItem[] = [
      {
        icon: DateTimeIcon(),
        key: 'date-picker',
        name: I18n.t('com.affine.editor.at-menu.date-picker'),
        action: () => {
          close();

          const getRect = () => {
            if (!inlineEditor.rootElement) {
              return { x: 0, y: 0, width: 0, height: 0 };
            }
            let rect = inlineEditor.getNativeRange()?.getBoundingClientRect();

            if (!rect || rect.width === 0 || rect.height === 0) {
              rect = inlineEditor.rootElement.getBoundingClientRect();
            }

            return rect;
          };

          const { x, y, width, height } = getRect();

          const id = this.dialogService.open('date-selector', {
            position: [x, y, width, height || 20],
            onSelect: date => {
              if (date) {
                onSelectDate(date);
                track.doc.editor.atMenu.linkDoc({
                  journal: true,
                  type: 'specific date',
                });
                this.dialogService.close(id);
              }
            },
          });
        },
      },
    ];

    const onSelectDate = (date: string) => {
      close();
      const doc = this.journalService.ensureJournalByDate(date);
      this.insertDoc(inlineEditor, doc.id);
    };

    if (suggestedDate) {
      const { dateString, alias } = suggestedDate;
      const dateDisplay = i18nTime(dateString, {
        absolute: { accuracy: 'day' },
      });

      const icon = this.docDisplayMetaService.getJournalIcon(dateString, {
        type: 'lit',
      });

      items.unshift({
        icon: icon(),
        key: dateString,
        name: alias
          ? html`${alias},
              <span style="color: ${cssVarV2('text/secondary')}"
                >${dateDisplay}</span
              >`
          : dateDisplay,
        action: () => {
          track.doc.editor.atMenu.linkDoc({
            journal: true,
            type: alias,
          });
          onSelectDate(dateString);
        },
      });
    }

    return {
      name: I18n.t('com.affine.editor.at-menu.journal'),
      items,
    };
  }

  private linkToDocGroup(
    query: string,
    close: () => void,
    inlineEditor: AffineInlineEditor,
    abortSignal: AbortSignal
  ): LinkedMenuGroup {
    const action = (meta: DocMeta) => {
      close();
      track.doc.editor.atMenu.linkDoc();
      this.insertDoc(inlineEditor, meta.id);
    };
    const result = this.docsSearchMenuService.getDocMenuGroup(
      query,
      action,
      abortSignal
    );
    const filterItem = (item: LinkedMenuItem) => {
      const isJournal = !!this.journalService.journalDate$(item.key).value;
      return !isJournal;
    };
    const items = result.items;
    if (Array.isArray(items)) {
      result.items = items.filter(filterItem);
    } else {
      result.items = computed(() => items.value.filter(filterItem));
    }
    return result;
  }

  private getMenusFn(): LinkedWidgetConfig['getMenus'] {
    return (query, close, editorHost, inlineEditor, abortSignal) => {
      return [
        this.journalGroup(query, close, inlineEditor),
        this.linkToDocGroup(query, close, inlineEditor, abortSignal),
        this.newDocMenuGroup(query, close, editorHost, inlineEditor),
      ];
    };
  }

  private getMobileConfig(): Partial<LinkedWidgetConfig['mobile']> {
    return {
      useScreenHeight: BUILD_CONFIG.isIOS,
      scrollContainer: window,
      scrollTopOffset: () => {
        const header = document.querySelector('header');
        if (!header) return 0;

        const { y, height } = header.getBoundingClientRect();
        return y + height;
      },
    };
  }
}
