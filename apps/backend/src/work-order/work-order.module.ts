import { Module } from '@nestjs/common';
import { WorkOrderController } from './work-order.controller';
import { WorkOrderPhotoService } from './work-order-photo.service';
import { WorkOrderService } from './work-order.service';

@Module({
  controllers: [WorkOrderController],
  providers: [WorkOrderService, WorkOrderPhotoService],
  exports: [WorkOrderService], // exportado para uso no QuoteModule (aprovação → cria OS em P07)
})
export class WorkOrderModule {}
