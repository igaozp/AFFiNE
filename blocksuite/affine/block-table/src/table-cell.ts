import {
  menu,
  popMenu,
  type PopupTarget,
  popupTargetFromElement,
} from '@blocksuite/affine-components/context-menu';
import { TextBackgroundDuotoneIcon } from '@blocksuite/affine-components/icons';
import {
  DefaultInlineManagerExtension,
  type RichText,
} from '@blocksuite/affine-components/rich-text';
import type { TableColumn, TableRow } from '@blocksuite/affine-model';
import { cssVarV2 } from '@blocksuite/affine-shared/theme';
import { getViewportElement } from '@blocksuite/affine-shared/utils';
import { ShadowlessElement } from '@blocksuite/block-std';
import { IS_MAC } from '@blocksuite/global/env';
import { SignalWatcher, WithDisposable } from '@blocksuite/global/utils';
import {
  ArrowDownBigIcon,
  ArrowLeftBigIcon,
  ArrowRightBigIcon,
  ArrowUpBigIcon,
  CloseIcon,
  ColorPickerIcon,
  CopyIcon,
  DeleteIcon,
  DuplicateIcon,
  InsertAboveIcon,
  InsertBelowIcon,
  InsertLeftIcon,
  InsertRightIcon,
  PasteIcon,
} from '@blocksuite/icons/lit';
import type { Text } from '@blocksuite/store';
import { computed, effect, signal } from '@preact/signals-core';
import { html, nothing } from 'lit';
import { property, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ref } from 'lit/directives/ref.js';
import { styleMap } from 'lit/directives/style-map.js';

import { colorList } from './color';
import { ColumnMaxWidth, DefaultColumnWidth } from './consts';
import type { SelectionController } from './selection-controller';
import {
  type TableAreaSelection,
  TableSelectionData,
} from './selection-schema';
import type { TableBlockComponent } from './table-block';
import {
  cellContainerStyle,
  columnOptionsCellStyle,
  columnOptionsStyle,
  rowOptionsCellStyle,
  rowOptionsStyle,
  threePointerIconDotStyle,
  threePointerIconStyle,
  widthDragHandleStyle,
} from './table-cell.css';
import type { TableDataManager } from './table-data-manager';

export class TableCell extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  @property({ attribute: false })
  accessor text: Text | undefined = undefined;

  @property({ type: Boolean })
  accessor readonly = false;

  @property({ attribute: false })
  accessor dataManager!: TableDataManager;

  @query('rich-text')
  accessor richText: RichText | null = null;

  @property({ type: Number })
  accessor rowIndex = 0;

  @property({ type: Number })
  accessor columnIndex = 0;

  @property({ attribute: false })
  accessor row: TableRow | undefined = undefined;

  @property({ attribute: false })
  accessor column: TableColumn | undefined = undefined;

  @property({ attribute: false })
  accessor selectionController!: SelectionController;

  get hoverColumnIndex$() {
    return this.dataManager.hoverColumnIndex$;
  }
  get hoverRowIndex$() {
    return this.dataManager.hoverRowIndex$;
  }
  get inlineManager() {
    return this.closest<TableBlockComponent>('affine-table')?.std.get(
      DefaultInlineManagerExtension.identifier
    );
  }

  get topContenteditableElement() {
    return this.closest<TableBlockComponent>('affine-table')
      ?.topContenteditableElement;
  }

  openColumnOptions(
    target: PopupTarget,
    column: TableColumn,
    columnIndex: number
  ) {
    this.selectionController.setSelected({
      type: 'column',
      columnId: column.columnId,
    });
    popMenu(target, {
      options: {
        onClose: () => {
          this.selectionController.setSelected(undefined);
        },
        items: [
          menu.group({
            items: [
              menu.subMenu({
                name: 'Background color',
                prefix: ColorPickerIcon(),
                options: {
                  items: [
                    { name: 'Default', color: undefined },
                    ...colorList,
                  ].map(item =>
                    menu.action({
                      prefix: html`<div
                        style="color: ${item.color ??
                        cssVarV2.layer.background
                          .primary};display: flex;align-items: center;justify-content: center;"
                      >
                        ${TextBackgroundDuotoneIcon}
                      </div>`,
                      name: item.name,
                      isSelected: column.backgroundColor === item.color,
                      select: () => {
                        this.dataManager.setColumnBackgroundColor(
                          column.columnId,
                          item.color
                        );
                      },
                    })
                  ),
                },
              }),
              ...(column.backgroundColor
                ? [
                    menu.action({
                      name: 'Clear column style',
                      prefix: CloseIcon(),
                      select: () => {
                        this.dataManager.setColumnBackgroundColor(
                          column.columnId,
                          undefined
                        );
                      },
                    }),
                  ]
                : []),
            ],
          }),
          menu.group({
            items: [
              menu.action({
                name: 'Insert Left',
                prefix: InsertLeftIcon(),
                select: () => {
                  this.dataManager.insertColumn(columnIndex - 1);
                },
              }),
              menu.action({
                name: 'Insert Right',
                prefix: InsertRightIcon(),
                select: () => {
                  this.dataManager.insertColumn(columnIndex + 1);
                },
              }),
              menu.action({
                name: 'Move Left',
                prefix: ArrowLeftBigIcon(),
                select: () => {
                  this.dataManager.moveColumn(columnIndex, columnIndex - 2);
                },
              }),
              menu.action({
                name: 'Move Right',
                prefix: ArrowRightBigIcon(),
                select: () => {
                  this.dataManager.moveColumn(columnIndex, columnIndex + 1);
                },
              }),
            ],
          }),
          menu.group({
            items: [
              menu.action({
                name: 'Duplicate',
                prefix: DuplicateIcon(),
                select: () => {
                  this.dataManager.duplicateColumn(columnIndex);
                },
              }),

              menu.action({
                name: 'Clear column contents',
                prefix: CloseIcon(),
                select: () => {
                  this.dataManager.clearColumn(column.columnId);
                },
              }),

              menu.action({
                name: 'Delete',
                class: {
                  'delete-item': true,
                },
                prefix: DeleteIcon(),
                select: () => {
                  this.dataManager.deleteColumn(column.columnId);
                },
              }),
            ],
          }),
        ],
      },
    });
  }

  openRowOptions(target: PopupTarget, row: TableRow, rowIndex: number) {
    this.selectionController.setSelected({
      type: 'row',
      rowId: row.rowId,
    });
    popMenu(target, {
      options: {
        onClose: () => {
          this.selectionController.setSelected(undefined);
        },
        items: [
          menu.group({
            items: [
              menu.subMenu({
                name: 'Background color',
                prefix: ColorPickerIcon(),
                options: {
                  items: [
                    { name: 'Default', color: undefined },
                    ...colorList,
                  ].map(item =>
                    menu.action({
                      prefix: html`<div
                        style="color: ${item.color ??
                        cssVarV2.layer.background
                          .primary};display: flex;align-items: center;justify-content: center;"
                      >
                        ${TextBackgroundDuotoneIcon}
                      </div>`,
                      name: item.name,
                      isSelected: row.backgroundColor === item.color,
                      select: () => {
                        this.dataManager.setRowBackgroundColor(
                          row.rowId,
                          item.color
                        );
                      },
                    })
                  ),
                },
              }),
              ...(row.backgroundColor
                ? [
                    menu.action({
                      name: 'Clear row style',
                      prefix: CloseIcon(),
                      select: () => {
                        this.dataManager.setRowBackgroundColor(
                          row.rowId,
                          undefined
                        );
                      },
                    }),
                  ]
                : []),
            ],
          }),
          menu.group({
            items: [
              menu.action({
                name: 'Insert Above',
                prefix: InsertAboveIcon(),
                select: () => {
                  this.dataManager.insertRow(rowIndex - 1);
                },
              }),
              menu.action({
                name: 'Insert Below',
                prefix: InsertBelowIcon(),
                select: () => {
                  this.dataManager.insertRow(rowIndex + 1);
                },
              }),
              menu.action({
                name: 'Move Up',
                prefix: ArrowUpBigIcon(),
                select: () => {
                  this.dataManager.moveRow(rowIndex, rowIndex - 1);
                },
              }),
              menu.action({
                name: 'Move Down',
                prefix: ArrowDownBigIcon(),
                select: () => {
                  this.dataManager.moveRow(rowIndex, rowIndex + 1);
                },
              }),
            ],
          }),
          menu.group({
            items: [
              menu.action({
                name: 'Duplicate',
                prefix: DuplicateIcon(),
                select: () => {
                  this.dataManager.duplicateRow(rowIndex);
                },
              }),
              menu.action({
                name: 'Clear row contents',
                prefix: CloseIcon(),
                select: () => {
                  this.dataManager.clearRow(row.rowId);
                },
              }),
              menu.action({
                name: 'Delete',
                class: {
                  'delete-item': true,
                },
                prefix: DeleteIcon(),
                select: () => {
                  this.dataManager.deleteRow(row.rowId);
                },
              }),
            ],
          }),
        ],
      },
    });
  }

  createColorPickerMenu(
    currentColor: string | undefined,
    select: (color?: string) => void
  ) {
    return menu.subMenu({
      name: 'Background color',
      prefix: ColorPickerIcon(),
      options: {
        items: [{ name: 'Default', color: undefined }, ...colorList].map(item =>
          menu.action({
            prefix: html`<div
              style="color: ${item.color ??
              cssVarV2.layer.background
                .primary};display: flex;align-items: center;justify-content: center;"
            >
              ${TextBackgroundDuotoneIcon}
            </div>`,
            name: item.name,
            isSelected: currentColor === item.color,
            select: () => {
              select(item.color);
            },
          })
        ),
      },
    });
  }

  onContextMenu(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    const selected = this.selectionController.selected$.value;
    if (!selected) {
      return;
    }
    if (selected.type === 'area' && e.currentTarget instanceof HTMLElement) {
      const target = popupTargetFromElement(e.currentTarget);
      popMenu(target, {
        options: {
          items: [
            menu.group({
              items: [
                menu.action({
                  name: 'Copy',
                  prefix: CopyIcon(),
                  select: () => {
                    this.selectionController.doCopyOrCut(selected, false);
                  },
                }),
                menu.action({
                  name: 'Paste',
                  prefix: PasteIcon(),
                  select: () => {
                    navigator.clipboard.readText().then(text => {
                      this.selectionController.doPaste(text, selected);
                    });
                  },
                }),
              ],
            }),
            menu.group({
              items: [
                menu.action({
                  name: 'Clear contents',
                  prefix: CloseIcon(),
                  select: () => {
                    this.dataManager.clearCellsBySelection(selected);
                  },
                }),
              ],
            }),
          ],
        },
      });
    }
  }

  renderColumnOptions(column: TableColumn, columnIndex: number) {
    const openColumnOptions = (e: Event) => {
      const element = e.currentTarget;
      if (element instanceof HTMLElement) {
        this.openColumnOptions(
          popupTargetFromElement(element),
          column,
          columnIndex
        );
      }
    };
    return html`<div class=${columnOptionsCellStyle}>
      <div
        class=${classMap({
          [columnOptionsStyle]: true,
        })}
        style=${styleMap({
          opacity: columnIndex === this.hoverColumnIndex$.value ? 1 : undefined,
        })}
        @click=${openColumnOptions}
      >
        ${threePointerIcon()}
      </div>
    </div>`;
  }

  renderRowOptions(row: TableRow, rowIndex: number) {
    const openRowOptions = (e: Event) => {
      const element = e.currentTarget;
      if (element instanceof HTMLElement) {
        this.openRowOptions(popupTargetFromElement(element), row, rowIndex);
      }
    };
    return html`<div class=${rowOptionsCellStyle}>
      <div
        class=${classMap({
          [rowOptionsStyle]: true,
        })}
        style=${styleMap({
          opacity: rowIndex === this.hoverRowIndex$.value ? 1 : undefined,
        })}
        @click=${openRowOptions}
      >
        ${threePointerIcon(true)}
      </div>
    </div>`;
  }
  renderOptionsButton() {
    if (!this.row || !this.column) {
      return nothing;
    }
    return html`
      ${this.rowIndex === 0
        ? this.renderColumnOptions(this.column, this.columnIndex)
        : nothing}
      ${this.columnIndex === 0
        ? this.renderRowOptions(this.row, this.rowIndex)
        : nothing}
    `;
  }

  tdMouseEnter(rowIndex: number, columnIndex: number) {
    this.hoverColumnIndex$.value = columnIndex;
    this.hoverRowIndex$.value = rowIndex;
  }

  tdMouseLeave() {
    this.hoverColumnIndex$.value = undefined;
    this.hoverRowIndex$.value = undefined;
  }

  virtualWidth$ = computed(() => {
    const virtualWidth = this.dataManager.virtualWidth$.value;
    if (!virtualWidth || this.column?.columnId !== virtualWidth.columnId) {
      return undefined;
    }
    return virtualWidth.width;
  });

  tdStyle() {
    const columnWidth = this.virtualWidth$.value ?? this.column?.width;
    const backgroundColor =
      this.column?.backgroundColor ?? this.row?.backgroundColor ?? undefined;
    return styleMap({
      backgroundColor,
      minWidth: columnWidth ? `${columnWidth}px` : `${DefaultColumnWidth}px`,
      maxWidth: columnWidth ? `${columnWidth}px` : `${ColumnMaxWidth}px`,
    });
  }

  renderWidthDragHandle() {
    const hoverColumnId$ = this.dataManager.hoverDragHandleColumnId$;
    const draggingColumnId$ = this.dataManager.draggingColumnId$;
    const rowIndex = this.rowIndex;
    const isFirstRow = rowIndex === 0;
    const isLastRow = rowIndex === this.dataManager.uiRows$.value.length - 1;
    const show =
      draggingColumnId$.value === this.column?.columnId ||
      hoverColumnId$.value === this.column?.columnId;
    return html`<div
      @mouseenter=${() => {
        hoverColumnId$.value = this.column?.columnId;
      }}
      @mouseleave=${() => {
        hoverColumnId$.value = undefined;
      }}
      style=${styleMap({
        opacity: show ? 1 : 0,
        borderRadius: isFirstRow
          ? '3px 3px 0 0'
          : isLastRow
            ? '0 0 3px 3px'
            : '0',
      })}
      data-width-adjust-column-id=${this.column?.columnId}
      class=${widthDragHandleStyle}
    ></div>`;
  }

  richText$ = signal<RichText>();

  get inlineEditor() {
    return this.richText$.value?.inlineEditor;
  }

  override connectedCallback() {
    super.connectedCallback();
    const selectAll = (e: KeyboardEvent) => {
      if (e.key === 'a' && (IS_MAC ? e.metaKey : e.ctrlKey)) {
        e.stopPropagation();
        e.preventDefault();
        this.inlineEditor?.selectAll();
      }
    };
    this.addEventListener('keydown', selectAll);
    this.disposables.add(() => {
      this.removeEventListener('keydown', selectAll);
    });
    this.disposables.addFromEvent(this, 'click', (e: MouseEvent) => {
      e.stopPropagation();
      requestAnimationFrame(() => {
        if (!this.inlineEditor?.inlineRange$.value) {
          this.inlineEditor?.focusEnd();
        }
      });
    });
  }

  override firstUpdated() {
    this.richText$.value?.updateComplete
      .then(() => {
        this.disposables.add(
          effect(() => {
            const richText = this.richText$.value;
            if (!richText) {
              return;
            }
            const inlineEditor = this.inlineEditor;
            if (!inlineEditor) {
              return;
            }
            const inlineRange = inlineEditor.inlineRange$.value;
            const targetSelection: TableAreaSelection = {
              type: 'area',
              rowStartIndex: this.rowIndex,
              rowEndIndex: this.rowIndex,
              columnStartIndex: this.columnIndex,
              columnEndIndex: this.columnIndex,
            };
            const currentSelection = this.selectionController.selected$.peek();
            if (
              inlineRange &&
              !TableSelectionData.equals(targetSelection, currentSelection)
            ) {
              this.selectionController.setSelected(targetSelection, false);
            }
          })
        );
      })
      .catch(console.error);
  }

  override render() {
    if (!this.text) {
      return html`<td class=${cellContainerStyle} style=${this.tdStyle()}>
        <div
          style=${styleMap({
            padding: '8px 12px',
          })}
        >
          <div style="height:22px"></div>
        </div>
      </td>`;
    }
    return html`
      <td
        data-row-id=${this.row?.rowId}
        data-column-id=${this.column?.columnId}
        @mouseenter=${() => {
          this.tdMouseEnter(this.rowIndex, this.columnIndex);
        }}
        @mouseleave=${() => {
          this.tdMouseLeave();
        }}
        @contextmenu=${this.onContextMenu}
        class=${cellContainerStyle}
        style=${this.tdStyle()}
      >
        <rich-text
          ${ref(this.richText$)}
          data-disable-ask-ai
          data-not-block-text
          style=${styleMap({
            minHeight: '22px',
            padding: '8px 12px',
          })}
          .yText="${this.text}"
          .inlineEventSource="${this.topContenteditableElement}"
          .attributesSchema="${this.inlineManager?.getSchema()}"
          .attributeRenderer="${this.inlineManager?.getRenderer()}"
          .embedChecker="${this.inlineManager?.embedChecker}"
          .markdownShortcutHandler="${this.inlineManager
            ?.markdownShortcutHandler}"
          .readonly="${this.readonly}"
          .enableClipboard="${true}"
          .verticalScrollContainerGetter="${() =>
            this.topContenteditableElement?.host
              ? getViewportElement(this.topContenteditableElement.host)
              : null}"
          data-parent-flavour="affine:table"
        ></rich-text>
        ${this.renderOptionsButton()} ${this.renderWidthDragHandle()}
      </td>
    `;
  }
}

const threePointerIcon = (vertical: boolean = false) => {
  return html`
    <div
      class=${threePointerIconStyle}
      style=${styleMap({
        transform: vertical ? 'rotate(90deg)' : undefined,
      })}
    >
      <div class=${threePointerIconDotStyle}></div>
      <div class=${threePointerIconDotStyle}></div>
      <div class=${threePointerIconDotStyle}></div>
    </div>
  `;
};
declare global {
  interface HTMLElementTagNameMap {
    'affine-table-cell': TableCell;
  }
}
