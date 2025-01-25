import { richTextColumnConfig } from '@blocksuite/affine-block-database';
import { type ListBlockModel, ListBlockSchema } from '@blocksuite/affine-model';
import { propertyPresets } from '@blocksuite/data-view/property-presets';

import { createBlockMeta } from './base.js';

export const todoMeta = createBlockMeta<ListBlockModel>({
  selector: block => {
    if (block.flavour !== ListBlockSchema.model.flavour) {
      return false;
    }

    return (block.model as ListBlockModel).type === 'todo';
  },
});
todoMeta.addProperty({
  name: 'Content',
  key: 'todo-title',
  metaConfig: richTextColumnConfig,
  get: block => block.text.yText,
  set: (_block, _value) => {
    //
  },
  updated: (block, callback) => {
    block.text?.yText.observe(callback);
    return {
      dispose: () => {
        block.text?.yText.unobserve(callback);
      },
    };
  },
});
todoMeta.addProperty({
  name: 'Checked',
  key: 'todo-checked',
  metaConfig: propertyPresets.checkboxPropertyConfig,
  get: block => block.checked,
  set: (block, value) => {
    block.checked = value;
  },
  updated: (block, callback) => {
    return block.propsUpdated.on(({ key }) => {
      if (key === 'checked') {
        callback();
      }
    });
  },
});

todoMeta.addProperty({
  name: 'Source',
  key: 'todo-source',
  metaConfig: propertyPresets.textPropertyConfig,
  get: block => block.doc.meta?.title ?? '',
  updated: (block, callback) => {
    return block.doc.workspace.slots.docListUpdated.on(() => {
      callback();
    });
  },
});
