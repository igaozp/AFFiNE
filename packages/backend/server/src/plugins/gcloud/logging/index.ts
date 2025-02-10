import { Global } from '@nestjs/common';

import { OptionalModule } from '../../../base';
import { loggerProvider } from './service';

@Global()
@OptionalModule({
  if: config => config.metrics.enabled,
  overrides: [loggerProvider],
})
export class GCloudLogging {}

export { AFFiNELogger } from './logger';
