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
import {
  ApproveQuoteSchema,
  RejectQuotePublicSchema,
  resolveQuoteDocOptions,
} from '@orcivo/shared-types';
import type { RejectQuotePublicDto } from '@orcivo/shared-types';
import { QuoteService } from './quote.service';
import { Public } from '../auth/decorators/public.decorator';
import { Request } from 'express';

/**
 * What the technician hid on the document (prices, validity, conditions) is not sent
 * to the client at all, not only hidden on screen.
 */
export function hideByDocOptions<
  T extends {
    doc_options?: unknown;
    subtotal?: unknown;
    discount_value?: unknown;
    total?: unknown;
    valid_until?: unknown;
    notes?: unknown;
    items: Array<{ unit_price?: unknown; total?: unknown }>;
  },
>(q: T): T {
  const o = resolveQuoteDocOptions(q.doc_options);
  return {
    ...q,
    subtotal: o.subtotal ? q.subtotal : null,
    discount_value: o.subtotal ? q.discount_value : null,
    total: o.total ? q.total : null,
    valid_until: o.validity ? q.valid_until : null,
    notes: o.terms ? q.notes : null,
    items: o.item_prices ? q.items : q.items.map(({ unit_price: _u, total: _t, ...rest }) => rest),
  } as T;
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
    return hideByDocOptions(await this.quoteService.getByApprovalToken(token));
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
