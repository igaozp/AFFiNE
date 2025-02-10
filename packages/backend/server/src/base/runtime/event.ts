import { FlattenedAppRuntimeConfig } from '../config/types';

declare global {
  interface Events {
    'runtime.changed__NOT_IMPLEMENTED__': Partial<FlattenedAppRuntimeConfig>;
  }
}
