import { createEvent } from '@toeverything/infra';

import type { DocRecord } from '../entities/record';

export const DocCreated = createEvent<DocRecord>('DocCreated');
