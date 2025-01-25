import {
  domToOffsets,
  getAreaByOffsets,
} from '@blocksuite/affine-shared/utils';
import type { UIEventStateContext } from '@blocksuite/block-std';
import { IS_MOBILE } from '@blocksuite/global/env';
import { computed } from '@preact/signals-core';
import type { ReactiveController } from 'lit';

import { ColumnMinWidth, DefaultColumnWidth } from './consts';
import {
  type TableAreaSelection,
  TableSelection,
  TableSelectionData,
} from './selection-schema';
import type { TableBlockComponent } from './table-block';
type Cells = string[][];
const TEXT = 'text/plain';
export class SelectionController implements ReactiveController {
  constructor(public readonly host: TableBlockComponent) {
    this.host.addController(this);
  }
  hostConnected() {
    this.dragListener();
    this.host.handleEvent('copy', this.onCopy);
    this.host.handleEvent('cut', this.onCut);
    this.host.handleEvent('paste', this.onPaste);
  }
  private get dataManager() {
    return this.host.dataManager;
  }
  private get clipboard() {
    return this.host.std.clipboard;
  }
  widthAdjust(dragHandle: HTMLElement, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const initialX = event.clientX;
    const currentWidth =
      dragHandle.closest('td')?.getBoundingClientRect().width ??
      DefaultColumnWidth;
    const columnId = dragHandle.dataset['widthAdjustColumnId'];
    if (!columnId) {
      return;
    }
    const onMove = (event: MouseEvent) => {
      this.dataManager.draggingColumnId$.value = columnId;
      this.dataManager.virtualWidth$.value = {
        columnId,
        width: Math.max(
          ColumnMinWidth,
          event.clientX - initialX + currentWidth
        ),
      };
    };
    const onUp = () => {
      const width = this.dataManager.virtualWidth$.value?.width;
      this.dataManager.draggingColumnId$.value = undefined;
      this.dataManager.virtualWidth$.value = undefined;
      if (width) {
        this.dataManager.setColumnWidth(columnId, width);
      }

      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }
  dragListener() {
    if (IS_MOBILE) {
      return;
    }
    this.host.disposables.addFromEvent(this.host, 'mousedown', event => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const dragHandle = target.closest('[data-width-adjust-column-id]');
      if (dragHandle instanceof HTMLElement) {
        this.widthAdjust(dragHandle, event);
        return;
      }
      this.onDragStart(event);
    });
  }
  readonly doCopyOrCut = (selection: TableAreaSelection, isCut: boolean) => {
    const columns = this.dataManager.uiColumns$.value;
    const rows = this.dataManager.uiRows$.value;
    const cells: Cells = [];
    const deleteCells: { rowId: string; columnId: string }[] = [];
    for (let i = selection.rowStartIndex; i <= selection.rowEndIndex; i++) {
      const row = rows[i];
      if (!row) {
        continue;
      }
      const rowCells: string[] = [];
      for (
        let j = selection.columnStartIndex;
        j <= selection.columnEndIndex;
        j++
      ) {
        const column = columns[j];
        if (!column) {
          continue;
        }
        const cell = this.dataManager.getCell(row.rowId, column.columnId);
        rowCells.push(cell?.text.toString() ?? '');
        if (isCut) {
          deleteCells.push({ rowId: row.rowId, columnId: column.columnId });
        }
      }
      cells.push(rowCells);
    }
    if (isCut) {
      this.dataManager.clearCells(deleteCells);
    }
    const text = cells.map(row => row.join('\t')).join('\n');
    this.clipboard
      .writeToClipboard(items => ({
        ...items,
        [TEXT]: text,
      }))
      .catch(console.error);
  };
  onCopy = () => {
    const selection = this.getSelected();
    if (!selection || selection.type !== 'area') {
      return false;
    }
    this.doCopyOrCut(selection, false);
    return true;
  };
  onCut = () => {
    const selection = this.getSelected();
    if (!selection || selection.type !== 'area') {
      return false;
    }
    this.doCopyOrCut(selection, true);
    return true;
  };
  doPaste = (plainText: string, selection: TableAreaSelection) => {
    try {
      const rowTextLists = plainText
        .split(/\r?\n/)
        .map(line => line.split('\t').map(cell => cell.trim()))
        .filter(row => row.some(cell => cell !== '')); // Filter out empty rows
      const height = rowTextLists.length;
      const width = rowTextLists[0]?.length ?? 0;
      if (height > 0 && width > 0) {
        const columns = this.dataManager.uiColumns$.value;
        const rows = this.dataManager.uiRows$.value;
        for (let i = selection.rowStartIndex; i <= selection.rowEndIndex; i++) {
          const row = rows[i];
          if (!row) {
            continue;
          }
          for (
            let j = selection.columnStartIndex;
            j <= selection.columnEndIndex;
            j++
          ) {
            const column = columns[j];
            if (!column) {
              continue;
            }
            const text = this.dataManager.getCell(
              row.rowId,
              column.columnId
            )?.text;
            if (text) {
              const rowIndex = (i - selection.rowStartIndex) % height;
              const columnIndex = (j - selection.columnStartIndex) % width;
              text.replace(
                0,
                text.length,
                rowTextLists[rowIndex]?.[columnIndex] ?? ''
              );
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  };
  onPaste = (_context: UIEventStateContext) => {
    const event = _context.get('clipboardState').raw;
    event.stopPropagation();
    const clipboardData = event.clipboardData;
    if (!clipboardData) return false;

    const selection = this.getSelected();
    if (!selection || selection.type !== 'area') {
      return false;
    }
    const plainText = clipboardData.getData('text/plain');
    this.doPaste(plainText, selection);
    return true;
  };
  onDragStart(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const offsets = domToOffsets(this.host, 'tr', 'td');
    if (!offsets) return;
    const startX = event.clientX;
    const startY = event.clientY;
    let selected = false;
    const initCell = target.closest('affine-table-cell');
    if (!initCell) {
      selected = true;
    }
    const onMove = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement) {
        const cell = target.closest('affine-table-cell');
        if (!selected && initCell === cell) {
          return;
        }
        selected = true;
        const endX = event.clientX;
        const endY = event.clientY;
        const [left, right] = startX > endX ? [endX, startX] : [startX, endX];
        const [top, bottom] = startY > endY ? [endY, startY] : [startY, endY];
        const area = getAreaByOffsets(offsets, top, bottom, left, right);
        this.setSelected({
          type: 'area',
          rowStartIndex: area.top,
          rowEndIndex: area.bottom,
          columnStartIndex: area.left,
          columnEndIndex: area.right,
        });
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  setSelected(
    selection: TableSelectionData | undefined,
    removeNativeSelection = true
  ) {
    if (selection) {
      const previous = this.getSelected();
      if (TableSelectionData.equals(previous, selection)) {
        return;
      }
      if (removeNativeSelection) {
        getSelection()?.removeAllRanges();
      }
      this.host.selection.set([
        new TableSelection({
          blockId: this.host.model.id,
          data: selection,
        }),
      ]);
    } else {
      this.host.selection.clear();
    }
  }
  selected$ = computed(() => this.getSelected());
  getSelected(): TableSelectionData | undefined {
    const selected = this.host.selected;

    if (selected instanceof TableSelection) {
      return selected.data;
    }
    return undefined;
  }
}
