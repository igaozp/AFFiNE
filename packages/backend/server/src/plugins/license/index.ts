import { OptionalModule } from '../../base';
import { PermissionModule } from '../../core/permission';
import { QuotaModule } from '../../core/quota';
import { LicenseResolver } from './resolver';
import { LicenseService } from './service';

@OptionalModule({
  imports: [QuotaModule, PermissionModule],
  providers: [LicenseService, LicenseResolver],
})
export class LicenseModule {}
