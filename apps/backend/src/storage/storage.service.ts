import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

const BUCKETS = ['orcivo-pdfs', 'orcivo-photos'] as const;

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly client: Client;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly config: ConfigService) {
    this.client = new Client({
      endPoint: config.getOrThrow('MINIO_ENDPOINT'),
      port: parseInt(config.get('MINIO_PORT', '9000')),
      useSSL: config.get('MINIO_USE_SSL', 'false') === 'true',
      accessKey: config.getOrThrow('MINIO_ACCESS_KEY'),
      secretKey: config.getOrThrow('MINIO_SECRET_KEY'),
    });
  }

  async onModuleInit() {
    for (const bucket of BUCKETS) {
      const exists = await this.client.bucketExists(bucket);
      if (!exists) {
        await this.client.makeBucket(bucket);
        const policy = JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${bucket}/*`],
            },
          ],
        });
        await this.client.setBucketPolicy(bucket, policy);
        this.logger.log(`Bucket criado: ${bucket}`);
      }
    }
  }

  async uploadBuffer(
    bucket: string,
    objectName: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    await this.client.putObject(bucket, objectName, buffer, buffer.length, {
      'Content-Type': contentType,
    });
    return `${this.config.getOrThrow('MINIO_PUBLIC_URL')}/${bucket}/${objectName}`;
  }

  async deleteObject(bucket: string, objectName: string): Promise<void> {
    await this.client.removeObject(bucket, objectName);
  }
}
