import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { WorkOrderService } from './work-order.service';

type PhotoStage = 'BEFORE' | 'DURING' | 'AFTER';
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class WorkOrderPhotoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly workOrderService: WorkOrderService,
  ) {}

  async uploadPhoto(
    workOrderId: string,
    companyId: string,
    userId: string,
    file: Express.Multer.File,
    stage: PhotoStage,
    caption?: string,
  ) {
    // T-2A-15: validar tipo e tamanho antes de chamar uploadBuffer
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de arquivo inválido. Use JPEG, PNG ou WebP.');
    }
    if (file.size > MAX_PHOTO_SIZE) {
      throw new BadRequestException('Arquivo muito grande. Máximo: 10MB.');
    }

    // T-2A-16: verificar que work order pertence ao tenant (lança 404 se cross-tenant)
    await this.workOrderService.findOne(workOrderId, companyId);

    const ext = file.mimetype.split('/')[1] || 'jpg';
    const objectName = `${companyId}/work-orders/${workOrderId}/${stage.toLowerCase()}/${crypto.randomUUID()}.${ext}`;
    const fileUrl = await this.storage.uploadBuffer('orcivo-photos', objectName, file.buffer, file.mimetype);

    return this.prisma.workOrderPhoto.create({
      data: {
        company_id: companyId,
        work_order_id: workOrderId,
        uploaded_by_user_id: userId,
        photo_stage: stage,
        file_url: fileUrl,
        caption,
      },
    });
  }

  async getPhotos(workOrderId: string, companyId: string) {
    await this.workOrderService.findOne(workOrderId, companyId); // tenant check
    return this.prisma.workOrderPhoto.findMany({
      where: { work_order_id: workOrderId, company_id: companyId },
      orderBy: [{ photo_stage: 'asc' }, { created_at: 'asc' }],
    });
  }

  async deletePhoto(photoId: string, workOrderId: string, companyId: string) {
    const photo = await this.prisma.workOrderPhoto.findFirst({
      where: { id: photoId, work_order_id: workOrderId, company_id: companyId },
    });
    if (!photo) throw new NotFoundException('Foto não encontrada');

    // Remove objeto do MinIO antes de deletar o registro
    const objectName = photo.file_url.split('/orcivo-photos/')[1];
    if (objectName) {
      await this.storage.deleteObject('orcivo-photos', objectName).catch(() => null);
    }

    await this.prisma.workOrderPhoto.delete({ where: { id: photoId } });
  }
}
