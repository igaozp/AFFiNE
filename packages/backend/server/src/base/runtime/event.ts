import { FlattenedAppRuntimeConfig } from '../config/types';
import { OnEvent } from '../event';
import { Payload } from '../event/def';

declare module '../event/def' {
  interface EventDefinitions {
    runtime: {
      [K in keyof FlattenedAppRuntimeConfig]: {
        changed: Payload<FlattenedAppRuntimeConfig[K]>;
      };
    };
  }
}

/**
 * not implemented yet
 */
export const OnRuntimeConfigChange_DO_NOT_USE = (
  nameWithModule: keyof FlattenedAppRuntimeConfig
) => {
  return OnEvent(`runtime.${nameWithModule}.changed`);
};
