import {
  BadRequestException,
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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
      // Cap protects the API from unbounded reads; screens page with Ver mais.
      Math.min(Number(limit) || 20, 100),
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

  /**
   * Send with a technician signature used only on this quote (not saved for reuse).
   * Multipart so photo signatures fit; same 2MB/type checks as PUT /users/me/signature.
   */
  @Post(':id/send/signature-once')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  sendWithOneOffSignature(
    @Param('id') id: string,
    @Req() req: TenantRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Arquivo de assinatura obrigatório.');
    return this.quoteService.send(id, req.companyId, req.user.userId, false, req.role, {
      buffer: file.buffer,
      mimetype: file.mimetype,
    });
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
