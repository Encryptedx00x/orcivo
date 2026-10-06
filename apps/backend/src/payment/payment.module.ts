import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { ReceiptPdfService } from './receipt-pdf.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [PaymentController],
  providers: [PaymentService, ReceiptPdfService],
})
export class PaymentModule {}
