import { createEvent } from '@toeverything/infra';

import type { Server } from '../entities/server';

export const ServerInitialized = createEvent<Server>('ServerInitialized');
