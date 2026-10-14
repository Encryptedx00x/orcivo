import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { receiptSignatureShouldApply, type ReceiptSignatureUpdate } from '@orcivo/shared-types';
import type { Response } from 'express';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminOnly } from '../auth/decorators/roles.decorator';
import { PaymentService } from './payment.service';
import {
  PaymentCreateSchema,
  PaymentDeleteSchema,
  PaymentListQuerySchema,
  PaymentSettleSchema,
  PaymentUpdateSchema,
  ReceiptSignatureSchema,
} from './payment.dto';
import { receiptNumber } from './receipt-pdf.service';

// Tenant context set by the global TenantGuard — see ADR-014.
// GET is open to any active member; writes are admin-only.
interface TenantRequest {
  companyId: string;
  user: { userId: string };
}

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  findAll(
    @Req() req: TenantRequest,
    @Query(new ZodValidationPipe(PaymentListQuerySchema)) query: unknown,
  ) {
    return this.paymentService.findAll(req.companyId, query as never);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: TenantRequest) {
    return this.paymentService.findOne(id, req.companyId);
  }

  /** Recibo em PDF (só para recebimento pago). */
  @Get(':id/receipt')
  async receipt(@Param('id') id: string, @Req() req: TenantRequest, @Res() res: Response) {
    const { buffer, number } = await this.paymentService.receiptPdfBuffer(id, req.companyId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="recibo-${receiptNumber(number)}.pdf"`,
      'Cache-Control': 'no-store',
    });
    res.send(buffer);
  }

  @AdminOnly()
  @Patch(':id/receipt-signature')
  @HttpCode(200)
  receiptSignature(
    @Param('id') id: string,
    @Req() req: TenantRequest,
    @Body(new ZodValidationPipe(ReceiptSignatureSchema)) body: unknown,
  ) {
    return this.paymentService.setReceiptSignature(
      id,
      req.companyId,
      req.user.userId,
      receiptSignatureShouldApply(body as ReceiptSignatureUpdate),
    );
  }

  /** Uses an image only on this receipt; it never changes the reusable signature. */
  @AdminOnly()
  @Post(':id/receipt-signature/once')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  receiptSignatureOnce(
    @Param('id') id: string,
    @Req() req: TenantRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Arquivo de assinatura obrigatório.');
    return this.paymentService.setReceiptSignatureOnce(
      id,
      req.companyId,
      req.user.userId,
      file.buffer,
      file.mimetype,
    );
  }

  @AdminOnly()
  @Post()
  @HttpCode(201)
  create(
    @Req() req: TenantRequest,
    @Body(new ZodValidationPipe(PaymentCreateSchema)) body: unknown,
  ) {
    return this.paymentService.create(body as never, req.companyId, req.user.userId);
  }

  @AdminOnly()
  @Patch(':id')
  @HttpCode(200)
  update(
    @Param('id') id: string,
    @Req() req: TenantRequest,
    @Body(new ZodValidationPipe(PaymentUpdateSchema)) body: unknown,
  ) {
    return this.paymentService.update(id, req.companyId, body as never, req.user.userId);
  }

  @AdminOnly()
  @Patch(':id/settle')
  @HttpCode(200)
  settle(
    @Param('id') id: string,
    @Req() req: TenantRequest,
    @Body(new ZodValidationPipe(PaymentSettleSchema)) body: unknown,
  ) {
    return this.paymentService.settle(id, req.companyId, body as never, req.user.userId);
  }

  @AdminOnly()
  @Delete(':id')
  @HttpCode(200)
  remove(
    @Param('id') id: string,
    @Req() req: TenantRequest,
    @Body(new ZodValidationPipe(PaymentDeleteSchema)) body: unknown,
  ) {
    return this.paymentService.remove(id, req.companyId, body as never, req.user.userId);
  }
}
