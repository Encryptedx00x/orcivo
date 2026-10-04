import { BadRequestException, Injectable } from '@nestjs/common';
import { StorageService, PHOTO_BUCKET } from '../storage/storage.service';

const MAX_SIGNATURE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * PB1-P10: one reusable signature per technician — never a standalone
 * signature table/framework (AC4). The object key itself
 * (`{company}/signatures/technicians/{user}`, no extension needed since S3
 * content-type is stored as object metadata) is both the tenant scope and
 * the existence check (AC3, P03 private storage): no DB row is needed.
 */
@Injectable()
export class UsersService {
  constructor(private readonly storage: StorageService) {}

  private objectKey(companyId: string, userId: string): string {
    return `${companyId}/signatures/technicians/${userId}`;
  }

  private async exists(objectKey: string): Promise<boolean> {
    try {
      await this.storage.getObjectBuffer(PHOTO_BUCKET, objectKey);
      return true;
    } catch {
      return false;
    }
  }

  /** Raw bytes of the technician's saved signature, or null if none. */
  async getSignatureBuffer(companyId: string, userId: string): Promise<Buffer | null> {
    try {
      return await this.storage.getObjectBuffer(PHOTO_BUCKET, this.objectKey(companyId, userId));
    } catch {
      return null;
    }
  }

  /** Resolves the technician's saved signature to a short-lived signed URL, or null if none. */
  async resolveSignatureUrl(companyId: string, userId: string): Promise<string | null> {
    const objectKey = this.objectKey(companyId, userId);
    if (!(await this.exists(objectKey))) return null;
    return this.storage.getSignedUrl(PHOTO_BUCKET, objectKey);
  }

  async getSignature(companyId: string, userId: string) {
    return { signature_url: await this.resolveSignatureUrl(companyId, userId) };
  }

  async saveSignature(companyId: string, userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo de assinatura obrigatório.');
    this.storage.assertUploadable(
      file.buffer,
      file.mimetype,
      MAX_SIGNATURE_SIZE,
      ALLOWED_MIME_TYPES,
    );

    const objectKey = this.objectKey(companyId, userId);
    await this.storage.uploadBuffer(PHOTO_BUCKET, objectKey, file.buffer, file.mimetype);

    return { signature_url: await this.storage.getSignedUrl(PHOTO_BUCKET, objectKey) };
  }
}
