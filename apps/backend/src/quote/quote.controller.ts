import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
} from '@nestjs/common';
import type { MemberRole } from '@prisma/client';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { QuoteCreateSchema, QuoteUpdateSchema } from '@orcivo/shared-types';
import { QuoteService } from './quote.service';
import { AdminOnly } from '../auth/decorators/roles.decorator';

// Tenant context set by the global TenantGuard — see ADR-014.
interface TenantRequest {
  companyId: string;
  user: { userId: string };
  /** Papel da membership ativa (set by TenantGuard) — usado para calcular allowed_actions. */
  role?: MemberRole;
}

@Controller('quotes')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Get()
  findAll(@Req() req: TenantRequest, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.quoteService.findAll(
      req.companyId,
      Number(page) || 1,
      Number(limit) || 20,
      req.role,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: TenantRequest) {
    return this.quoteService.findOne(id, req.companyId, req.role);
  }

  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'inline; filename="orcamento.pdf"')
  async pdf(@Param('id') id: string, @Req() req: TenantRequest): Promise<StreamableFile> {
    const buffer = await this.quoteService.generatePdf(id, req.companyId);
    return new StreamableFile(buffer);
  }

  @Post()
  @HttpCode(201)
  create(@Body(new ZodValidationPipe(QuoteCreateSchema)) body: unknown, @Req() req: TenantRequest) {
    return this.quoteService.create(body as never, req.companyId, req.user.userId);
  }

  // PB1-P35/AC1: edição direta dos campos do orçamento fora do assistente guiado.
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(QuoteUpdateSchema)) body: unknown,
    @Req() req: TenantRequest,
  ) {
    return this.quoteService.update(id, body as never, req.companyId, req.user.userId, req.role);
  }

  @Post(':id/send')
  @HttpCode(200)
  send(
    @Param('id') id: string,
    @Req() req: TenantRequest,
    @Body('apply_signature') applySignature?: boolean,
  ) {
    return this.quoteService.send(
      id,
      req.companyId,
      req.user.userId,
      applySignature === true,
      req.role,
    );
  }

  @Patch(':id/cancel')
  @HttpCode(200)
  cancel(@Param('id') id: string, @Req() req: TenantRequest, @Body('reason') reason?: string) {
    return this.quoteService.cancel(id, req.companyId, req.user.userId, reason, req.role);
  }

  @Patch(':id/reject')
  @HttpCode(200)
  reject(@Param('id') id: string, @Req() req: TenantRequest, @Body('reason') reason?: string) {
    return this.quoteService.reject(id, req.companyId, req.user.userId, reason, req.role);
  }

  // reabrir/corrigir são ações de correção sobre estados terminais — @AdminOnly (P-01).
  @Patch(':id/reopen')
  @AdminOnly()
  @HttpCode(200)
  reopen(@Param('id') id: string, @Req() req: TenantRequest, @Body('reason') reason?: string) {
    return this.quoteService.reopen(id, req.companyId, req.user.userId, reason, req.role);
  }

  @Patch(':id/correct')
  @AdminOnly()
  @HttpCode(200)
  correct(@Param('id') id: string, @Req() req: TenantRequest, @Body('reason') reason?: string) {
    return this.quoteService.correct(id, req.companyId, req.user.userId, reason, req.role);
  }
}
