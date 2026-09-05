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
} from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminOnly } from '../auth/decorators/roles.decorator';
import { PaymentService } from './payment.service';
import { PaymentCreateSchema, PaymentListQuerySchema, PaymentSettleSchema } from './payment.dto';

// Tenant context set by the global TenantGuard — see ADR-014.
// GET is open to any active member; writes are admin-only.
interface TenantRequest {
  companyId: string;
  user: { userId: string };
}

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  findAll(
    @Req() req: TenantRequest,
    @Query(new ZodValidationPipe(PaymentListQuerySchema)) query: unknown,
  ) {
    return this.paymentService.findAll(req.companyId, query as never);
  }

  @AdminOnly()
  @Post()
  @HttpCode(201)
  create(
    @Req() req: TenantRequest,
    @Body(new ZodValidationPipe(PaymentCreateSchema)) body: unknown,
  ) {
    return this.paymentService.create(body as never, req.companyId, req.user.userId);
  }

  @AdminOnly()
  @Patch(':id/settle')
  @HttpCode(200)
  settle(
    @Param('id') id: string,
    @Req() req: TenantRequest,
    @Body(new ZodValidationPipe(PaymentSettleSchema)) body: unknown,
  ) {
    return this.paymentService.settle(id, req.companyId, body as never, req.user.userId);
  }

  @AdminOnly()
  @Delete(':id')
  @HttpCode(200)
  remove(@Param('id') id: string, @Req() req: TenantRequest) {
    return this.paymentService.remove(id, req.companyId, req.user.userId);
  }
}
