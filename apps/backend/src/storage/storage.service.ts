import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

export const PDF_BUCKET = 'orcivo-pdfs';
export const PHOTO_BUCKET = 'orcivo-photos';
const BUCKETS = [PDF_BUCKET, PHOTO_BUCKET] as const;

const DEFAULT_SIGNED_URL_TTL = 300; // 5 min

// Magic-byte signatures for the only content types domain uploads accept.
// P03-T08: never trust the client-declared MIME.
const MAGIC: Record<string, (b: Buffer) => boolean> = {
  'image/jpeg': (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) =>
    b.length > 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a,
  'image/webp': (b) =>
    b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  'application/pdf': (b) => b.length > 4 && b.toString('ascii', 0, 5) === '%PDF-',
};

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly client: Client;
  private readonly logger = new Logger(StorageService.name);
  private readonly signedUrlTtl: number;

  constructor(config: ConfigService) {
    this.client = new Client({
      endPoint: config.getOrThrow('MINIO_ENDPOINT'),
      port: parseInt(config.get('MINIO_PORT', '9000')),
      useSSL: config.get('MINIO_USE_SSL', 'false') === 'true',
      accessKey: config.getOrThrow('MINIO_ACCESS_KEY'),
      secretKey: config.getOrThrow('MINIO_SECRET_KEY'),
    });
    this.signedUrlTtl = parseInt(
      config.get('STORAGE_SIGNED_URL_TTL', String(DEFAULT_SIGNED_URL_TTL)),
    );
  }

  async onModuleInit() {
    // P03-T03: domain buckets are private. Create if missing and, either way,
    // drop any bucket policy (a stale public "s3:GetObject / Principal *" from an
    // earlier build). Idempotent, touches no object, so it is SAFE_AUTO.
    for (const bucket of BUCKETS) {
      if (!(await this.client.bucketExists(bucket))) {
        await this.client.makeBucket(bucket);
        this.logger.log(`Bucket criado (privado): ${bucket}`);
      }
      await this.client.setBucketPolicy(bucket, '').catch(() => {
        // MinIO returns NoSuchBucketPolicy when there is nothing to clear — fine.
      });
    }
  }

  /**
   * P03-T08: validate real content before it reaches the bucket.
   * Throws BadRequestException on empty / oversized / magic-byte mismatch.
   */
  assertUploadable(
    buffer: Buffer,
    declaredMime: string,
    maxBytes: number,
    allowed: readonly string[],
  ): void {
    if (!buffer || buffer.length === 0) throw new BadRequestException('Arquivo vazio.');
    if (buffer.length > maxBytes) throw new BadRequestException('Arquivo muito grande.');
    if (!allowed.includes(declaredMime)) {
      throw new BadRequestException(`Tipo de arquivo inválido. Aceitos: ${allowed.join(', ')}.`);
    }
    const check = MAGIC[declaredMime];
    if (!check || !check(buffer)) {
      throw new BadRequestException('Conteúdo do arquivo não corresponde ao tipo declarado.');
    }
  }

  /**
   * Uploads and returns the stored reference = the object key (never a URL).
   * P03-T07: the key is the stable reference; URLs are resolved on read.
   */
  async uploadBuffer(
    bucket: string,
    objectName: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    if (objectName.includes('..')) throw new BadRequestException('Nome de objeto inválido.');
    await this.client.putObject(bucket, objectName, buffer, buffer.length, {
      'Content-Type': contentType,
    });
    return objectName;
  }

  /**
   * Accepts a stored reference in either form:
   *  - new: bare object key (`{company}/quotes/{id}.pdf`)
   *  - legacy: full public URL (`http://host:9000/orcivo-pdfs/{company}/...`)
   * Returns the object key relative to `bucket`, or null if it belongs elsewhere.
   */
  extractKey(bucket: string, stored: string | null | undefined): string | null {
    if (!stored) return null;
    if (!/^https?:\/\//i.test(stored)) return stored; // already a key
    const marker = `/${bucket}/`;
    const at = stored.indexOf(marker);
    return at === -1 ? null : stored.slice(at + marker.length);
  }

  /** Presigned GET URL. TTL is clamped to `maxTtl` when given (public-token flow). */
  async getSignedUrl(bucket: string, objectKey: string, maxTtl?: number): Promise<string> {
    const ttl = Math.max(1, Math.min(this.signedUrlTtl, maxTtl ?? this.signedUrlTtl));
    return this.client.presignedGetObject(bucket, objectKey, ttl);
  }

  /** Resolve a stored reference (key or legacy URL) to a fresh signed URL. */
  async resolveUrl(
    bucket: string,
    stored: string | null | undefined,
    maxTtl?: number,
  ): Promise<string | null> {
    const key = this.extractKey(bucket, stored);
    if (!key) return null;
    return this.getSignedUrl(bucket, key, maxTtl);
  }

  async deleteObject(bucket: string, objectName: string): Promise<void> {
    await this.client.removeObject(bucket, objectName);
  }

  /** Downloads an object's raw bytes (used to serve an already-generated file, e.g. a quote PDF). */
  async getObjectBuffer(bucket: string, objectKey: string): Promise<Buffer> {
    const stream = await this.client.getObject(bucket, objectKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
  }
}
