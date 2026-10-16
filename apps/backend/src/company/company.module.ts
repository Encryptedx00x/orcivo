import { Module } from '@nestjs/common';
import { CompaniesController, CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [BillingModule],
  controllers: [CompanyController, CompaniesController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}
