import { Global, Module } from '@nestjs/common';

import { Runtime } from './service';

@Global()
@Module({
  providers: [Runtime],
  exports: [Runtime],
})
export class RuntimeModule {}
export { Runtime };
