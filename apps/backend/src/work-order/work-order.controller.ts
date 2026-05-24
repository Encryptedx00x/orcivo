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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { WorkOrderCreateSchema, WorkOrderUpdateSchema } from '@orcivo/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { WorkOrderPhotoService } from './work-order-photo.service';
import { WorkOrderService } from './work-order.service';

interface TenantRequest {
  companyId: string;
  user: { userId: string };
}

const VALID_STAGES = ['BEFORE', 'DURING', 'AFTER'] as const;
type PhotoStage = typeof VALID_STAGES[number];

@Controller('work-orders')
@UseGuards(JwtAuthGuard, TenantGuard)
export class WorkOrderController {
  constructor(
    private readonly workOrderService: WorkOrderService,
    private readonly photoService: WorkOrderPhotoService,
  ) {}

  @Get()
  findAll(
    @Req() req: TenantRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workOrderService.findAll(req.companyId, Number(page) || 1, Number(limit) || 20);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: TenantRequest) {
    return this.workOrderService.findOne(id, req.companyId);
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
    return this.workOrderService.update(id, body as never, req.companyId);
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
    return this.photoService.uploadPhoto(id, req.companyId, req.user.userId, file, stage as PhotoStage, caption);
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
