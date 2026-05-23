import { Controller, Get, Param } from '@nestjs/common';
import { QuoteService } from './quote.service';

// AVISO: Este controller é intencionalmente público — sem JwtAuthGuard, sem TenantGuard.
// TenantGuard lança ForbiddenException se request.user for undefined, mesmo com @Public().
// A separação em controller dedicado é a solução correta (conforme nota de interfaces do plano).
@Controller('quotes/public')
export class QuotePublicController {
  constructor(private readonly quoteService: QuoteService) {}

  @Get(':token')
  getPublicQuote(@Param('token') token: string) {
    return this.quoteService.getByApprovalToken(token);
  }
  // POST /:token/approve será adicionado em P07 neste mesmo controller
}
