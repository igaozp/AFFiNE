import type {
  TableBlockPropsSerialized,
  TableCellSerialized,
  TableColumn,
  TableRow,
} from '@blocksuite/affine-model';
import { HastUtils, TextUtils } from '@blocksuite/affine-shared/adapters';
import { generateFractionalIndexingKeyBetween } from '@blocksuite/affine-shared/utils';
import type { DeltaInsert } from '@blocksuite/inline';
import { nanoid } from '@blocksuite/store';
import type { Element, ElementContent } from 'hast';
import type { PhrasingContent, Table as MarkdownTable, TableCell } from 'mdast';
function calculateColumnWidths(rows: string[][]): number[] {
  return (
    rows[0]?.map((_, colIndex) =>
      Math.max(...rows.map(row => (row[colIndex] || '').length))
    ) ?? []
  );
}

function formatRow(
  row: string[],
  columnWidths: number[],
  isHeader: boolean
): string {
  const cells = row.map((cell, colIndex) =>
    cell?.padEnd(columnWidths[colIndex] ?? 0, ' ')
  );
  const rowString = `| ${cells.join(' | ')} |`;
  return isHeader
    ? `${rowString}\n${formatSeparator(columnWidths)}`
    : rowString;
}

function formatSeparator(columnWidths: number[]): string {
  const separator = columnWidths.map(width => '-'.repeat(width)).join(' | ');
  return `| ${separator} |`;
}

export function formatTable(rows: string[][]): string {
  const columnWidths = calculateColumnWidths(rows);
  const formattedRows = rows.map((row, index) =>
    formatRow(row, columnWidths, index === 0)
  );
  return formattedRows.join('\n');
}
type Table = {
  rows: Row[];
};
type Row = {
  cells: Cell[];
};
type Cell = {
  value: { delta: DeltaInsert[] };
};
export const processTable = (
  columns: Record<string, TableColumn>,
  rows: Record<string, TableRow>,
  cells: Record<string, TableCellSerialized>
): Table => {
  const sortedColumns = Object.values(columns).sort((a, b) =>
    a.order.localeCompare(b.order)
  );
  const sortedRows = Object.values(rows).sort((a, b) =>
    a.order.localeCompare(b.order)
  );
  const table: Table = {
    rows: [],
  };
  sortedRows.forEach(r => {
    const row: Row = {
      cells: [],
    };
    sortedColumns.forEach(col => {
      const cell = cells[`${r.rowId}:${col.columnId}`];
      if (!cell) {
        row.cells.push({
          value: {
            delta: [],
          },
        });
        return;
      }
      row.cells.push({
        value: cell.text,
      });
    });
    table.rows.push(row);
  });
  return table;
};
const getTextFromElement = (element: ElementContent): string => {
  if (element.type === 'text') {
    return element.value;
  }
  if (element.type === 'element') {
    return element.children.map(child => getTextFromElement(child)).join('');
  }
  return '';
};

const getAllTag = (node: Element | undefined, tagName: string): Element[] => {
  if (!node) {
    return [];
  }
  if (HastUtils.isElement(node)) {
    if (node.tagName === tagName) {
      return [node];
    }
    return node.children.flatMap(child => {
      if (HastUtils.isElement(child)) {
        return getAllTag(child, tagName);
      }
      return [];
    });
  }
  return [];
};

export const createTableProps = (rowTextLists: string[][]) => {
  const createIdAndOrder = (count: number) => {
    const result: { id: string; order: string }[] = Array.from({
      length: count,
    });
    for (let i = 0; i < count; i++) {
      const id = nanoid();
      const order = generateFractionalIndexingKeyBetween(
        result[i - 1]?.order ?? null,
        null
      );
      result[i] = { id, order };
    }
    return result;
  };
  const columnCount = Math.max(...rowTextLists.map(row => row.length));
  const rowCount = rowTextLists.length;

  const columns: TableColumn[] = createIdAndOrder(columnCount).map(v => ({
    columnId: v.id,
    order: v.order,
  }));
  const rows: TableRow[] = createIdAndOrder(rowCount).map(v => ({
    rowId: v.id,
    order: v.order,
  }));

  const cells: Record<string, TableCellSerialized> = {};
  for (let i = 0; i < rowCount; i++) {
    for (let j = 0; j < columnCount; j++) {
      const row = rows[i];
      const column = columns[j];
      if (!row || !column) {
        continue;
      }
      const cellId = `${row.rowId}:${column.columnId}`;
      const text = rowTextLists[i]?.[j];
      cells[cellId] = {
        text: TextUtils.createText(text ?? ''),
      };
    }
  }
  return {
    columns: Object.fromEntries(
      columns.map(column => [column.columnId, column])
    ),
    rows: Object.fromEntries(rows.map(row => [row.rowId, row])),
    cells,
  };
};

export const parseTableFromHtml = (
  element: Element
): TableBlockPropsSerialized => {
  const headerRows = getAllTag(element, 'thead').flatMap(node =>
    getAllTag(node, 'tr').map(tr => getAllTag(tr, 'th'))
  );
  const bodyRows = getAllTag(element, 'tbody').flatMap(node =>
    getAllTag(node, 'tr').map(tr => getAllTag(tr, 'td'))
  );
  const footerRows = getAllTag(element, 'tfoot').flatMap(node =>
    getAllTag(node, 'tr').map(tr => getAllTag(tr, 'td'))
  );
  const allRows = [...headerRows, ...bodyRows, ...footerRows];
  const rowTextLists: string[][] = [];
  allRows.forEach(cells => {
    const row: string[] = [];
    cells.forEach(cell => {
      row.push(getTextFromElement(cell));
    });
    rowTextLists.push(row);
  });
  return createTableProps(rowTextLists);
};

const getTextFromTableCell = (node: TableCell) => {
  const getTextFromPhrasingContent = (node: PhrasingContent) => {
    if (node.type === 'text') {
      return node.value;
    }
    return '';
  };
  return node.children.map(child => getTextFromPhrasingContent(child)).join('');
};

export const parseTableFromMarkdown = (node: MarkdownTable) => {
  const rowTextLists: string[][] = [];
  node.children.forEach(row => {
    const rowText: string[] = [];
    row.children.forEach(cell => {
      rowText.push(getTextFromTableCell(cell));
    });
    rowTextLists.push(rowText);
  });
  return createTableProps(rowTextLists);
};
