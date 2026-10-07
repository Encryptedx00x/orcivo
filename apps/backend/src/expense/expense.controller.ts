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
import { z } from 'zod';
import { ExpenseCreateSchema, ExpenseUpdateSchema } from '@orcivo/shared-types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminOnly } from '../auth/decorators/roles.decorator';
import { ExpenseService, type ExpenseListQuery } from './expense.service';

interface TenantRequest {
  companyId: string;
  user: { userId: string };
}

const ListQuery = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  status: z.enum(['PENDING', 'PAID']).optional(),
  work_order_id: z.string().uuid().optional(),
  quote_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
});
const SummaryQuery = z.object({ from: z.string().datetime(), to: z.string().datetime() });

// Reads are open to members; writes are admin-only (same as payments).
@Controller()
export class ExpenseController {
  constructor(private readonly expenses: ExpenseService) {}

  @Get('expenses')
  findAll(@Req() req: TenantRequest, @Query(new ZodValidationPipe(ListQuery)) q: unknown) {
    return this.expenses.findAll(req.companyId, q as ExpenseListQuery);
  }

  @AdminOnly()
  @Post('expenses')
  @HttpCode(201)
  create(
    @Req() req: TenantRequest,
    @Body(new ZodValidationPipe(ExpenseCreateSchema)) body: unknown,
  ) {
    return this.expenses.create(body as never, req.companyId, req.user.userId);
  }

  @AdminOnly()
  @Patch('expenses/:id')
  update(
    @Param('id') id: string,
    @Req() req: TenantRequest,
    @Body(new ZodValidationPipe(ExpenseUpdateSchema)) body: unknown,
  ) {
    return this.expenses.update(id, body as never, req.companyId, req.user.userId);
  }

  @AdminOnly()
  @Delete('expenses/:id')
  remove(@Param('id') id: string, @Req() req: TenantRequest) {
    return this.expenses.remove(id, req.companyId, req.user.userId);
  }

  /** Financeiro: revenue, costs and result of a period. */
  @Get('finance/summary')
  summary(@Req() req: TenantRequest, @Query(new ZodValidationPipe(SummaryQuery)) q: unknown) {
    const { from, to } = q as z.infer<typeof SummaryQuery>;
    return this.expenses.summary(req.companyId, new Date(from), new Date(to));
  }
}
