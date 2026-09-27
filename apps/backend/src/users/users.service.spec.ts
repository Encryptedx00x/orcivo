import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { StorageService } from '../storage/storage.service';

const mockStorage = {
  assertUploadable: jest.fn(),
  uploadBuffer: jest.fn((_bucket: string, objectName: string) => Promise.resolve(objectName)),
  getSignedUrl: jest.fn((_bucket: string, key: string) =>
    Promise.resolve(`https://minio.example.com/signed/${key}`),
  ),
  getObjectBuffer: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: StorageService, useValue: mockStorage }],
    }).compile();
    service = module.get(UsersService);
  });

  describe('getSignature()', () => {
    it('Test 1 (AC3): resolve a signature key privada e tenant-scoped (bucket privado) para uma signed URL', async () => {
      mockStorage.getObjectBuffer.mockResolvedValue(Buffer.from('png-bytes'));

      const result = await service.getSignature('comp-1', 'user-1');

      expect(mockStorage.getObjectBuffer).toHaveBeenCalledWith(
        'orcivo-photos',
        'comp-1/signatures/technicians/user-1',
      );
      expect(mockStorage.getSignedUrl).toHaveBeenCalledWith(
        'orcivo-photos',
        'comp-1/signatures/technicians/user-1',
      );
      expect(result.signature_url).toContain('comp-1/signatures/technicians/user-1');
    });

    it('Test 2: sem assinatura salva retorna signature_url null', async () => {
      mockStorage.getObjectBuffer.mockRejectedValue(new Error('NoSuchKey'));

      const result = await service.getSignature('comp-1', 'user-1');

      expect(result.signature_url).toBeNull();
    });
  });

  describe('saveSignature()', () => {
    it('Test 3 (AC1/AC3): salva a assinatura como object key privado no bucket de fotos, tenant-scoped', async () => {
      const file = {
        buffer: Buffer.from('fake-png'),
        mimetype: 'image/png',
      } as Express.Multer.File;

      const result = await service.saveSignature('comp-1', 'user-1', file);

      expect(mockStorage.assertUploadable).toHaveBeenCalledWith(
        file.buffer,
        'image/png',
        2 * 1024 * 1024,
        ['image/png', 'image/jpeg', 'image/webp'],
      );
      expect(mockStorage.uploadBuffer).toHaveBeenCalledWith(
        'orcivo-photos',
        'comp-1/signatures/technicians/user-1',
        file.buffer,
        'image/png',
      );
      expect(result.signature_url).toContain('comp-1/signatures/technicians/user-1');
    });

    it('Test 4: sem arquivo lança BadRequestException', async () => {
      await expect(
        service.saveSignature('comp-1', 'user-1', undefined as unknown as Express.Multer.File),
      ).rejects.toThrow(BadRequestException);
    });

    it('Test 5: reenviar a assinatura sobrescreve a mesma key (uma assinatura reutilizável por técnico — AC1/AC4)', async () => {
      const file = { buffer: Buffer.from('v2'), mimetype: 'image/jpeg' } as Express.Multer.File;

      await service.saveSignature('comp-1', 'user-1', file);

      expect(mockStorage.uploadBuffer).toHaveBeenCalledWith(
        'orcivo-photos',
        'comp-1/signatures/technicians/user-1',
        file.buffer,
        'image/jpeg',
      );
    });
  });
});
