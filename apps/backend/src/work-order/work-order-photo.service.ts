import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService, PHOTO_BUCKET } from '../storage/storage.service';
import { WorkOrderService } from './work-order.service';

type PhotoStage = 'BEFORE' | 'DURING' | 'AFTER';
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTOS_PER_STAGE = 20; // P03-T08: bound the number of objects per stage

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
    // T-2A-16: verificar que work order pertence ao tenant (lança 404 se cross-tenant)
    await this.workOrderService.findOne(workOrderId, companyId);

    // P03-T08: content validation (magic bytes / empty / size) — never trust the MIME header.
    this.storage.assertUploadable(file.buffer, file.mimetype, MAX_PHOTO_SIZE, ALLOWED_MIME_TYPES);

    const stageCount = await this.prisma.workOrderPhoto.count({
      where: { work_order_id: workOrderId, company_id: companyId, photo_stage: stage },
    });
    if (stageCount >= MAX_PHOTOS_PER_STAGE) {
      throw new BadRequestException(`Limite de ${MAX_PHOTOS_PER_STAGE} fotos por etapa atingido.`);
    }

    const ext = file.mimetype.split('/')[1] || 'jpg';
    const objectName = `${companyId}/work-orders/${workOrderId}/${stage.toLowerCase()}/${crypto.randomUUID()}.${ext}`;
    const objectKey = await this.storage.uploadBuffer(
      PHOTO_BUCKET,
      objectName,
      file.buffer,
      file.mimetype,
    );

    const photo = await this.prisma.workOrderPhoto.create({
      data: {
        company_id: companyId,
        work_order_id: workOrderId,
        uploaded_by_user_id: userId,
        photo_stage: stage,
        file_url: objectKey, // P03-T07: store the stable object key, not a URL
        caption,
      },
    });
    return { ...photo, file_url: await this.storage.resolveUrl(PHOTO_BUCKET, objectKey) };
  }

  async getPhotos(workOrderId: string, companyId: string) {
    await this.workOrderService.findOne(workOrderId, companyId); // tenant check
    const photos = await this.prisma.workOrderPhoto.findMany({
      where: { work_order_id: workOrderId, company_id: companyId },
      orderBy: [{ photo_stage: 'asc' }, { created_at: 'asc' }],
    });
    // P03-T05: resolve each stored key to a short-lived signed URL on read.
    return Promise.all(
      photos.map(async (p) => ({
        ...p,
        file_url: await this.storage.resolveUrl(PHOTO_BUCKET, p.file_url),
      })),
    );
  }

  async deletePhoto(photoId: string, workOrderId: string, companyId: string) {
    const photo = await this.prisma.workOrderPhoto.findFirst({
      where: { id: photoId, work_order_id: workOrderId, company_id: companyId },
    });
    if (!photo) throw new NotFoundException('Foto não encontrada');

    // Remove objeto do MinIO antes de deletar o registro (aceita key nova ou URL legada).
    const key = this.storage.extractKey(PHOTO_BUCKET, photo.file_url);
    if (key) {
      await this.storage.deleteObject(PHOTO_BUCKET, key).catch(() => null);
    }

    await this.prisma.workOrderPhoto.delete({ where: { id: photoId } });
  }
}
