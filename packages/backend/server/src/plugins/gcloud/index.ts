import './config';

import { Global } from '@nestjs/common';

import { Plugin } from '../registry';
import { GCloudLogging } from './logging';
import { GCloudMetrics } from './metrics';

@Global()
@Plugin({
  name: 'gcloud',
  imports: [GCloudMetrics, GCloudLogging],
})
export class GCloudModule {}
