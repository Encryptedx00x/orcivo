import { Global, Module } from '@nestjs/common';
import { TenantOwnershipService } from './tenant-ownership.service';

@Global()
@Module({
  providers: [TenantOwnershipService],
  exports: [TenantOwnershipService],
})
export class TenantModule {}
