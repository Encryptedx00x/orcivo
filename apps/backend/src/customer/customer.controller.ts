import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CustomerCreateSchema, CustomerListQuerySchema } from '@orcivo/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CustomerService } from './customer.service';

interface TenantRequest {
  companyId: string;
}

@Controller('customers')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  findAll(
    @Req() req: TenantRequest,
    @Query(new ZodValidationPipe(CustomerListQuerySchema)) query: unknown,
  ) {
    return this.customerService.findAll(req.companyId, query as never);
  }

  @HttpCode(201)
  @Post()
  create(
    @Req() req: TenantRequest,
    @Body(new ZodValidationPipe(CustomerCreateSchema)) body: unknown,
  ) {
    return this.customerService.create(body as never, req.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: TenantRequest) {
    return this.customerService.findOne(id, req.companyId);
  }
}
