import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PaymentService } from './payment.service';
import {
  PaymentCreateSchema,
  PaymentListQuerySchema,
  PaymentSettleSchema,
} from './payment.dto';

interface TenantRequest {
  companyId: string;
}

@Controller('payments')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  findAll(
    @Req() req: TenantRequest,
    @Query(new ZodValidationPipe(PaymentListQuerySchema)) query: unknown,
  ) {
    return this.paymentService.findAll(req.companyId, query as never);
  }

  @Post()
  @HttpCode(201)
  create(
    @Req() req: TenantRequest,
    @Body(new ZodValidationPipe(PaymentCreateSchema)) body: unknown,
  ) {
    return this.paymentService.create(body as never, req.companyId);
  }

  @Patch(':id/settle')
  @HttpCode(200)
  settle(
    @Param('id') id: string,
    @Req() req: TenantRequest,
    @Body(new ZodValidationPipe(PaymentSettleSchema)) body: unknown,
  ) {
    return this.paymentService.settle(id, req.companyId, body as never);
  }

  @Delete(':id')
  @HttpCode(200)
  remove(@Param('id') id: string, @Req() req: TenantRequest) {
    return this.paymentService.remove(id, req.companyId);
  }
}
