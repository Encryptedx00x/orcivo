import { Body, Controller, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ApproveQuoteSchema } from '@orcivo/shared-types';
import { QuoteService } from './quote.service';
import { Request } from 'express';

// AVISO: Este controller e intencionalmente publico — sem JwtAuthGuard, sem TenantGuard.
// TenantGuard lanca ForbiddenException se request.user for undefined, mesmo com @Public().
// A separacao em controller dedicado e a solucao correta (conforme nota de interfaces do plano).
@Controller('quotes/public')
export class QuotePublicController {
  constructor(private readonly quoteService: QuoteService) {}

  @Get(':token')
  getPublicQuote(@Param('token') token: string) {
    return this.quoteService.getByApprovalToken(token);
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
}
