import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  StreamableFile,
} from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ApproveQuoteSchema, RejectQuotePublicSchema } from '@orcivo/shared-types';
import type { RejectQuotePublicDto } from '@orcivo/shared-types';
import { QuoteService } from './quote.service';
import { Public } from '../auth/decorators/public.decorator';
import { Request } from 'express';

/**
 * "Sem preços" / "Só o total": what the technician chose to hide is not sent to the
 * client at all (not only hidden on screen).
 */
export function hidePrices<
  T extends {
    price_display?: string | null;
    subtotal?: unknown;
    discount_value?: unknown;
    total?: unknown;
    items: Array<{ unit_price?: unknown; total?: unknown }>;
  },
>(q: T): T {
  if (!q.price_display || q.price_display === 'ITEMS') return q;
  const items = q.items.map(({ unit_price: _u, total: _t, ...rest }) => rest);
  if (q.price_display === 'TOTAL') {
    return { ...q, subtotal: null, discount_value: null, items } as T;
  }
  return { ...q, subtotal: null, discount_value: null, total: null, items } as T;
}

// AVISO: Este controller e intencionalmente publico — sem JwtAuthGuard, sem TenantGuard.
// TenantGuard lanca ForbiddenException se request.user for undefined, mesmo com @Public().
// A separacao em controller dedicado e a solucao correta (conforme nota de interfaces do plano).
@Public()
@Controller('quotes/public')
export class QuotePublicController {
  constructor(private readonly quoteService: QuoteService) {}

  @Get(':token')
  async getPublicQuote(@Param('token') token: string) {
    return hidePrices(await this.quoteService.getByApprovalToken(token));
  }

  // Serve o PDF ja gerado (nao regenera) para o token dado — mesmo escopo de
  // acesso do GET acima: so o orcamento daquele token, sem guard de auth.
  // Opens in the browser so the client can read it before approving; ?download=1 saves it.
  @Get(':token/pdf')
  async getPublicQuotePdf(
    @Param('token') token: string,
    @Query('download') download?: string,
  ): Promise<StreamableFile> {
    const buffer = await this.quoteService.getPdfByApprovalToken(token);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `${download ? 'attachment' : 'inline'}; filename="orcamento.pdf"`,
    });
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
