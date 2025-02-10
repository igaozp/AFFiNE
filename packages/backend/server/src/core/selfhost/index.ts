import { Module } from '@nestjs/common';

import { AuthModule } from '../auth';
import { ServerConfigModule } from '../config';
import { UserModule } from '../user';
import { CustomSetupController } from './controller';
import { SetupMiddleware } from './setup';
import { StaticFilesResolver } from './static';

@Module({
  imports: [AuthModule, UserModule, ServerConfigModule],
  providers: [SetupMiddleware, StaticFilesResolver],
  controllers: [CustomSetupController],
})
export class SelfhostModule {}
