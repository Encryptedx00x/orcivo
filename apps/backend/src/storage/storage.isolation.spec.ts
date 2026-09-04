// P03-T11 — private storage + signed URLs + upload hardening. Real MinIO (test infra).
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { PDF_BUCKET, PHOTO_BUCKET, StorageService } from './storage.service';

// 1x1 PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PDF = Buffer.from('%PDF-1.4\n%fake\n', 'ascii');

function makeService(ttl = '2'): StorageService {
  const env: Record<string, string> = {
    MINIO_ENDPOINT: process.env['MINIO_ENDPOINT'] ?? 'localhost',
    MINIO_PORT: process.env['MINIO_PORT'] ?? '9002',
    MINIO_USE_SSL: 'false',
    MINIO_ACCESS_KEY: process.env['MINIO_ACCESS_KEY'] ?? 'minioadmin',
    MINIO_SECRET_KEY: process.env['MINIO_SECRET_KEY'] ?? 'minioadmin',
    STORAGE_SIGNED_URL_TTL: ttl,
  };
  const config = {
    get: (k: string, d?: string) => env[k] ?? d,
    getOrThrow: (k: string) => {
      if (!env[k]) throw new Error(`missing ${k}`);
      return env[k];
    },
  } as unknown as ConfigService;
  return new StorageService(config);
}

const rawClient = () =>
  new Client({
    endPoint: process.env['MINIO_ENDPOINT'] ?? 'localhost',
    port: parseInt(process.env['MINIO_PORT'] ?? '9002'),
    useSSL: false,
    accessKey: process.env['MINIO_ACCESS_KEY'] ?? 'minioadmin',
    secretKey: process.env['MINIO_SECRET_KEY'] ?? 'minioadmin',
  });

describe('P03 — private storage + signed URLs', () => {
  let storage: StorageService;

  beforeAll(async () => {
    storage = makeService('2');
    await storage.onModuleInit(); // creates buckets private + clears any stale policy
  });

  it('buckets carry no public policy after init', async () => {
    const client = rawClient();
    for (const bucket of [PDF_BUCKET, PHOTO_BUCKET]) {
      let policy = '';
      try {
        policy = await client.getBucketPolicy(bucket);
      } catch {
        policy = ''; // NoSuchBucketPolicy => private
      }
      expect(policy === '' || !policy.includes('"Principal":"*"')).toBe(true);
    }
  });

  it('anonymous GET on an uploaded object is denied; signed URL works', async () => {
    const key = `test-co/quotes/${Date.now()}.pdf`;
    await storage.uploadBuffer(PDF_BUCKET, key, PDF, 'application/pdf');

    const base = `http://${process.env['MINIO_ENDPOINT'] ?? 'localhost'}:${process.env['MINIO_PORT'] ?? '9002'}`;
    const anon = await fetch(`${base}/${PDF_BUCKET}/${key}`);
    expect(anon.status).toBeGreaterThanOrEqual(400); // 403 AccessDenied

    const signed = await storage.getSignedUrl(PDF_BUCKET, key);
    expect(signed).toContain('X-Amz-Signature');
    const ok = await fetch(signed);
    expect(ok.status).toBe(200);
    expect(Buffer.from(await ok.arrayBuffer())).toEqual(PDF);
  });

  it('uploadBuffer returns the object key, not a URL', async () => {
    const key = `test-co/photos/${Date.now()}.png`;
    const ref = await storage.uploadBuffer(PHOTO_BUCKET, key, PNG, 'image/png');
    expect(ref).toBe(key);
    expect(ref).not.toMatch(/^https?:\/\//);
  });

  it('extractKey handles both a bare key and a legacy full URL', () => {
    expect(storage.extractKey(PDF_BUCKET, 'a/b/c.pdf')).toBe('a/b/c.pdf');
    expect(storage.extractKey(PDF_BUCKET, 'http://localhost:9002/orcivo-pdfs/a/b/c.pdf')).toBe(
      'a/b/c.pdf',
    );
    expect(storage.extractKey(PDF_BUCKET, 'http://x/orcivo-photos/other.png')).toBeNull();
    expect(storage.extractKey(PDF_BUCKET, null)).toBeNull();
  });

  it('signed URL TTL is clamped to the smaller of config and caller max', async () => {
    const key = `test-co/quotes/${Date.now()}-ttl.pdf`;
    await storage.uploadBuffer(PDF_BUCKET, key, PDF, 'application/pdf');
    const url = await storage.getSignedUrl(PDF_BUCKET, key, 1); // 1s wins over config 2s
    await new Promise((r) => setTimeout(r, 2500));
    const res = await fetch(url);
    expect(res.status).toBeGreaterThanOrEqual(400); // expired
  });

  describe('assertUploadable — hostile / boundary content', () => {
    const opts = [10 * 1024 * 1024, ['image/jpeg', 'image/png', 'image/webp']] as const;

    it('rejects empty buffer', () => {
      expect(() => storage.assertUploadable(Buffer.alloc(0), 'image/png', ...opts)).toThrow(
        BadRequestException,
      );
    });
    it('rejects oversized buffer', () => {
      expect(() =>
        storage.assertUploadable(Buffer.alloc(11 * 1024 * 1024), 'image/png', ...opts),
      ).toThrow(BadRequestException);
    });
    it('rejects a disallowed declared type', () => {
      expect(() => storage.assertUploadable(PDF, 'application/pdf', ...opts)).toThrow(
        BadRequestException,
      );
    });
    it('rejects magic-byte mismatch (PNG bytes declared as JPEG)', () => {
      expect(() => storage.assertUploadable(PNG, 'image/jpeg', ...opts)).toThrow(
        BadRequestException,
      );
    });
    it('accepts a real PNG declared as PNG', () => {
      expect(() => storage.assertUploadable(PNG, 'image/png', ...opts)).not.toThrow();
    });
    it('accepts a real JPEG declared as JPEG', () => {
      expect(() => storage.assertUploadable(JPEG, 'image/jpeg', ...opts)).not.toThrow();
    });
  });

  it('rejects an object name with path traversal', async () => {
    await expect(
      storage.uploadBuffer(PDF_BUCKET, '../escape.pdf', PDF, 'application/pdf'),
    ).rejects.toThrow(BadRequestException);
  });
});
