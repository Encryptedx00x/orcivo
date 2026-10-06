import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Req,
  StreamableFile,
} from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ApproveQuoteSchema, RejectQuotePublicSchema } from '@orcivo/shared-types';
import type { RejectQuotePublicDto } from '@orcivo/shared-types';
import { QuoteService } from './quote.service';
import { Public } from '../auth/decorators/public.decorator';
import { Request } from 'express';

// AVISO: Este controller e intencionalmente publico — sem JwtAuthGuard, sem TenantGuard.
// TenantGuard lanca ForbiddenException se request.user for undefined, mesmo com @Public().
// A separacao em controller dedicado e a solucao correta (conforme nota de interfaces do plano).
@Public()
@Controller('quotes/public')
export class QuotePublicController {
  constructor(private readonly quoteService: QuoteService) {}

  @Get(':token')
  getPublicQuote(@Param('token') token: string) {
    return this.quoteService.getByApprovalToken(token);
  }

  // Serve o PDF ja gerado (nao regenera) para o token dado — mesmo escopo de
  // acesso do GET acima: so o orcamento daquele token, sem guard de auth.
  @Get(':token/pdf')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="orcamento.pdf"')
  async getPublicQuotePdf(@Param('token') token: string): Promise<StreamableFile> {
    const buffer = await this.quoteService.getPdfByApprovalToken(token);
    return new StreamableFile(buffer);
  }

  @Post(':token/approve')
  @HttpCode(200)
  async approve(
    @Param('token') token: string,
    @Body(new ZodValidationPipe(ApproveQuoteSchema)) body: unknown,
    @Req() req: Request,
  ) {
    const ipAddress = (req.ip ?? req.socket?.remoteAddress ?? 'unknown') as string;
    const userAgent = (req.headers['user-agent'] ?? '') as string;
    return this.quoteService.approve(token, body as never, ipAddress, userAgent);
  }

  @Post(':token/reject')
  @HttpCode(200)
  reject(
    @Param('token') token: string,
    @Body(new ZodValidationPipe(RejectQuotePublicSchema)) body: RejectQuotePublicDto,
  ) {
    return this.quoteService.rejectByToken(token, body.reason);
  }
}
