import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QuoteController } from './quote.controller';
import { QuotePublicController } from './quote-public.controller';
import { QuoteExpiryProcessor } from './quote-expiry.processor';
import { QuotePdfService } from './quote-pdf.service';
import { QuoteService } from './quote.service';
import { WorkOrderModule } from '../work-order/work-order.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'quote-expiry' }), WorkOrderModule, UsersModule],
  controllers: [QuoteController, QuotePublicController],
  providers: [QuoteService, QuoteExpiryProcessor, QuotePdfService],
  exports: [QuoteService],
})
export class QuoteModule {}
