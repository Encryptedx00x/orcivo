import {
  Body,
  Controller,
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
import { QuoteCreateSchema } from '@orcivo/shared-types';
import { QuoteService } from './quote.service';

interface TenantRequest {
  companyId: string;
  user: { userId: string };
}

@Controller('quotes')
@UseGuards(JwtAuthGuard, TenantGuard)
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Get()
  findAll(
    @Req() req: TenantRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.quoteService.findAll(
      req.companyId,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: TenantRequest) {
    return this.quoteService.findOne(id, req.companyId);
  }

  @Post()
  @HttpCode(201)
  create(
    @Body(new ZodValidationPipe(QuoteCreateSchema)) body: unknown,
    @Req() req: TenantRequest,
  ) {
    return this.quoteService.create(body as never, req.companyId, req.user.userId);
  }

  @Post(':id/send')
  @HttpCode(200)
  send(@Param('id') id: string, @Req() req: TenantRequest) {
    return this.quoteService.send(id, req.companyId);
  }

  @Patch(':id/cancel')
  @HttpCode(200)
  cancel(
    @Param('id') id: string,
    @Req() req: TenantRequest,
    @Body('reason') reason?: string,
  ) {
    return this.quoteService.cancel(id, req.companyId, reason);
  }
}
