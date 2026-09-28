import { NotFoundException } from '@nestjs/common';
import { CatalogService } from './catalog.service';

const row = {
  id: 'item-1',
  company_id: 'company-1',
  name: 'Camera',
  description: null,
  type: 'PRODUCT' as const,
  unit_price: '199.90',
  quantity: 3,
  low_stock_threshold: 5,
  cost_price: '120.00',
  sale_price: '199.90',
  unit: 'un',
  photo_url: null,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('CatalogService photo storage', () => {
  const storage = {
    assertUploadable: jest.fn(),
    uploadBuffer: jest.fn(),
    resolveUrl: jest.fn(),
    extractKey: jest.fn(),
    deleteObject: jest.fn(),
  };
  const prisma = { $queryRaw: jest.fn() };
  const service = new CatalogService(prisma as never, storage as never);
  const file = {
    buffer: Buffer.from('image'),
    mimetype: 'image/png',
  } as Express.Multer.File;

  beforeEach(() => {
    jest.clearAllMocks();
    storage.uploadBuffer.mockResolvedValue('company-1/catalog/item-1/new.png');
    storage.resolveUrl.mockResolvedValue('https://minio.test/signed/new.png');
    storage.extractKey.mockImplementation((_bucket: string, value: string | null) => value);
    storage.deleteObject.mockResolvedValue(undefined);
  });

  it('creates an item without requiring a photo', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ ...row, photo_url: null }]);
    storage.resolveUrl.mockResolvedValue(null);

    const result = await service.create(
      {
        name: 'Visita técnica',
        type: 'SERVICE',
        unit_price: '100.00',
        cost_price: '0.00',
        quantity: 0,
        low_stock_threshold: 5,
        is_active: true,
      },
      'company-1',
    );

    expect(result.photo_url).toBeNull();
    expect(storage.uploadBuffer).not.toHaveBeenCalled();
  });

  it('stores a tenant-scoped object key and returns a signed URL when replacing the optional photo', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      { ...row, photo_url: 'company-1/catalog/item-1/old.png' },
    ]);
    prisma.$queryRaw.mockResolvedValueOnce([
      { ...row, photo_url: 'company-1/catalog/item-1/new.png' },
    ]);

    const result = await service.uploadPhoto('item-1', 'company-1', file);

    expect(storage.assertUploadable).toHaveBeenCalledWith(
      file.buffer,
      'image/png',
      10 * 1024 * 1024,
      ['image/jpeg', 'image/png', 'image/webp'],
    );
    expect(storage.uploadBuffer).toHaveBeenCalledWith(
      'orcivo-photos',
      expect.stringMatching(/^company-1\/catalog\/item-1\//),
      file.buffer,
      'image/png',
    );
    expect(storage.deleteObject).toHaveBeenCalledWith(
      'orcivo-photos',
      'company-1/catalog/item-1/old.png',
    );
    expect(result).toMatchObject({
      photo_url: 'https://minio.test/signed/new.png',
      is_low_stock: true,
    });
  });

  it('does not upload a photo for an item outside the current tenant', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]);

    await expect(service.uploadPhoto('other-item', 'company-1', file)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(storage.uploadBuffer).not.toHaveBeenCalled();
  });

  it('clears the optional photo and deletes the previous private object', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      { ...row, photo_url: 'company-1/catalog/item-1/old.png' },
    ]);
    prisma.$queryRaw.mockResolvedValueOnce([{ ...row, photo_url: null }]);
    storage.resolveUrl.mockResolvedValue(null);

    const result = await service.deletePhoto('item-1', 'company-1');

    expect(storage.deleteObject).toHaveBeenCalledWith(
      'orcivo-photos',
      'company-1/catalog/item-1/old.png',
    );
    expect(result.photo_url).toBeNull();
  });
});
