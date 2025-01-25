import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';

import { t } from '../../core/logical/type-presets.js';
import { propertyType } from '../../core/property/property-config.js';

export const datePropertyType = propertyType('date');
export const datePropertyModelConfig = datePropertyType.modelConfig<number>({
  name: 'Date',
  type: () => t.date.instance(),
  defaultData: () => ({}),
  cellToString: ({ value }) => format(value, 'yyyy-MM-dd'),
  cellFromString: ({ value }) => {
    const date = parse(value, 'yyyy-MM-dd', new Date());

    return {
      value: +date,
    };
  },
  cellToJson: ({ value }) => value ?? null,
  cellFromJson: ({ value }) => (typeof value !== 'number' ? undefined : value),
  isEmpty: ({ value }) => value == null,
});
