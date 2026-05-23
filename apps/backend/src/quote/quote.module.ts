import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QuoteController } from './quote.controller';
import { QuotePublicController } from './quote-public.controller';
import { QuoteExpiryProcessor } from './quote-expiry.processor';
import { QuoteService } from './quote.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'quote-expiry' })],
  controllers: [QuoteController, QuotePublicController],
  providers: [QuoteService, QuoteExpiryProcessor],
  exports: [QuoteService],
})
export class QuoteModule {}
