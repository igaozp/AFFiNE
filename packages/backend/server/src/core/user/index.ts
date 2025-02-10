import { Module } from '@nestjs/common';

import { PermissionModule } from '../permission';
import { StorageModule } from '../storage';
import { UserAvatarController } from './controller';
import { UserEventsListener } from './event';
import { UserManagementResolver, UserResolver } from './resolver';

@Module({
  imports: [StorageModule, PermissionModule],
  providers: [UserResolver, UserManagementResolver, UserEventsListener],
  controllers: [UserAvatarController],
})
export class UserModule {}

export { PublicUserType, UserType } from './types';
