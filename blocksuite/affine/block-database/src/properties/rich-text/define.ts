import type { AffineTextAttributes } from '@blocksuite/affine-shared/types';
import { propertyType, t } from '@blocksuite/data-view';
import type { DeltaInsert } from '@blocksuite/inline';
import { Text } from '@blocksuite/store';

import { HostContextKey } from '../../context/host-context.js';
import { isLinkedDoc } from '../../utils/title-doc.js';
import { type RichTextCellType, toYText } from '../utils.js';

export const richTextColumnType = propertyType('rich-text');

export const richTextPropertyModelConfig =
  richTextColumnType.modelConfig<RichTextCellType>({
    name: 'Text',
    type: () => t.richText.instance(),
    defaultData: () => ({}),
    cellToString: ({ value }) => value?.toString() ?? '',
    cellFromString: ({ value }) => {
      return {
        value: new Text(value),
      };
    },
    cellToJson: ({ value, dataSource }) => {
      if (!value) return null;
      const host = dataSource.contextGet(HostContextKey);
      if (host) {
        const collection = host.std.workspace;
        const yText = toYText(value);
        const deltas = yText.toDelta();
        const text = deltas
          .map((delta: DeltaInsert<AffineTextAttributes>) => {
            if (isLinkedDoc(delta)) {
              const linkedDocId = delta.attributes?.reference?.pageId as string;
              return collection.getDoc(linkedDocId)?.meta?.title;
            }
            return delta.insert;
          })
          .join('');
        return text;
      }
      return value?.toString() ?? null;
    },
    cellFromJson: ({ value }) =>
      typeof value !== 'string' ? undefined : new Text(value),
    onUpdate: ({ value, callback }) => {
      const yText = toYText(value);
      yText.observe(callback);
      callback();
      return {
        dispose: () => {
          yText.unobserve(callback);
        },
      };
    },
    isEmpty: ({ value }) => value == null || value.length === 0,
    values: ({ value }) => (value?.toString() ? [value.toString()] : []),
  });
