import {
  BadRequestException,
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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { MemberRole } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { WorkOrderCreateSchema, WorkOrderUpdateSchema } from '@orcivo/shared-types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminOnly } from '../auth/decorators/roles.decorator';
import { WorkOrderPhotoService } from './work-order-photo.service';
import { WorkOrderService } from './work-order.service';

// Tenant context set by the global TenantGuard — see ADR-014.
interface TenantRequest {
  companyId: string;
  user: { userId: string };
  /** Papel da membership ativa (set by TenantGuard) — usado para calcular allowed_actions. */
  role?: MemberRole;
}

const VALID_STAGES = ['BEFORE', 'DURING', 'AFTER'] as const;
type PhotoStage = (typeof VALID_STAGES)[number];

@Controller('work-orders')
export class WorkOrderController {
  constructor(
    private readonly workOrderService: WorkOrderService,
    private readonly photoService: WorkOrderPhotoService,
  ) {}

  @Get()
  findAll(@Req() req: TenantRequest, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.workOrderService.findAll(
      req.companyId,
      Number(page) || 1,
      Number(limit) || 20,
      req.role,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: TenantRequest) {
    return this.workOrderService.findOne(id, req.companyId, req.role);
  }

  @Post()
  @HttpCode(201)
  create(
    @Body(new ZodValidationPipe(WorkOrderCreateSchema)) body: unknown,
    @Req() req: TenantRequest,
  ) {
    return this.workOrderService.create(body as never, req.companyId, req.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(WorkOrderUpdateSchema)) body: unknown,
    @Req() req: TenantRequest,
  ) {
    return this.workOrderService.update(id, body as never, req.companyId, req.user.userId);
  }

  // ── Ações de domínio (P-01 / ADR-016): transições explícitas, não select livre ──

  /** iniciar: PENDING → IN_PROGRESS (qualquer membro ativo). */
  @Patch(':id/start')
  @HttpCode(200)
  start(@Param('id') id: string, @Req() req: TenantRequest) {
    return this.workOrderService.start(id, req.companyId, req.user.userId, req.role);
  }

  /** concluir: IN_PROGRESS → DONE (qualquer membro ativo). */
  @Patch(':id/complete')
  @HttpCode(200)
  complete(@Param('id') id: string, @Req() req: TenantRequest) {
    return this.workOrderService.complete(id, req.companyId, req.user.userId, req.role);
  }

  /** cancelar: PENDING/IN_PROGRESS → CANCELLED — motivo obrigatório. */
  @Patch(':id/cancel')
  @HttpCode(200)
  cancel(@Param('id') id: string, @Req() req: TenantRequest, @Body('reason') reason?: string) {
    return this.workOrderService.cancel(id, req.companyId, req.user.userId, reason, req.role);
  }

  // reabrir/corrigir são ações de correção sobre estados terminais — @AdminOnly (P-01).

  /** reabrir: DONE/CANCELLED → IN_PROGRESS — motivo obrigatório, @AdminOnly. */
  @Patch(':id/reopen')
  @AdminOnly()
  @HttpCode(200)
  reopen(@Param('id') id: string, @Req() req: TenantRequest, @Body('reason') reason?: string) {
    return this.workOrderService.reopen(id, req.companyId, req.user.userId, reason, req.role);
  }

  /** corrigir: ajuste pós-encerramento — não muda status, motivo obrigatório, @AdminOnly. */
  @Patch(':id/correct')
  @AdminOnly()
  @HttpCode(200)
  correct(
    @Param('id') id: string,
    @Req() req: TenantRequest,
    @Body('reason') reason?: string,
    @Body('title') title?: string,
    @Body('notes') notes?: string,
    @Body('scheduled_at') scheduled_at?: string,
    @Body('assigned_to_user_id') assigned_to_user_id?: string | null,
  ) {
    return this.workOrderService.correct(
      id,
      req.companyId,
      req.user.userId,
      { reason, title, notes, scheduled_at, assigned_to_user_id },
      req.role,
    );
  }

  // T-2A-17: stage validado no controller antes de chamar service
  @Post(':id/photos')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadPhoto(
    @Param('id') id: string,
    @Req() req: TenantRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body('stage') stage: string,
    @Body('caption') caption?: string,
  ) {
    if (!VALID_STAGES.includes(stage as PhotoStage)) {
      throw new BadRequestException('stage inválido. Use: BEFORE, DURING ou AFTER');
    }
    return this.photoService.uploadPhoto(
      id,
      req.companyId,
      req.user.userId,
      file,
      stage as PhotoStage,
      caption,
    );
  }

  @Get(':id/photos')
  getPhotos(@Param('id') id: string, @Req() req: TenantRequest) {
    return this.photoService.getPhotos(id, req.companyId);
  }

  @Delete(':id/photos/:photoId')
  @HttpCode(204)
  deletePhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Req() req: TenantRequest,
  ) {
    return this.photoService.deletePhoto(photoId, id, req.companyId);
  }
}
