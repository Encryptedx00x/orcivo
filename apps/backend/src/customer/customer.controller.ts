import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import { CustomerCreateSchema, CustomerListQuerySchema } from '@orcivo/shared-types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CustomerService } from './customer.service';

// Tenant context (companyId/role) is set by the global TenantGuard — see ADR-014.
interface TenantRequest {
  companyId: string;
}

@Controller('customers')
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
