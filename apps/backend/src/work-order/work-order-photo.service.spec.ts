import { WorkOrderPhotoService } from './work-order-photo.service';

describe('WorkOrderPhotoService', () => {
  const prisma = {
    workOrderPhoto: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  };
  const storage = {
    assertUploadable: jest.fn(),
    uploadBuffer: jest.fn(),
    resolveUrl: jest.fn(),
    extractKey: jest.fn(),
    deleteObject: jest.fn(),
  };
  const workOrders = { findOne: jest.fn() };
  const service = new WorkOrderPhotoService(prisma as never, storage as never, workOrders as never);
  const file = {
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    mimetype: 'image/png',
  } as Express.Multer.File;

  beforeEach(() => {
    jest.clearAllMocks();
    workOrders.findOne.mockResolvedValue({ id: 'wo-1' });
    prisma.workOrderPhoto.count.mockResolvedValue(0);
    storage.uploadBuffer.mockImplementation(async (_bucket: string, key: string) => key);
    storage.resolveUrl.mockImplementation(async (_bucket: string, key: string) => `signed:${key}`);
  });

  it.each(['BEFORE', 'DURING', 'AFTER'] as const)(
    'persiste a categoria %s no tenant e a devolve na resposta',
    async (stage) => {
      prisma.workOrderPhoto.create.mockImplementation(async ({ data }: { data: object }) => ({
        id: `photo-${stage}`,
        ...data,
      }));

      const result = await service.uploadPhoto('wo-1', 'company-1', 'user-1', file, stage);

      expect(prisma.workOrderPhoto.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          company_id: 'company-1',
          work_order_id: 'wo-1',
          uploaded_by_user_id: 'user-1',
          photo_stage: stage,
        }),
      });
      expect(result).toMatchObject({ photo_stage: stage });
    },
  );

  it('reidrata as categorias persistidas ao reabrir a OS', async () => {
    prisma.workOrderPhoto.findMany.mockResolvedValue([
      { id: 'p1', photo_stage: 'BEFORE', file_url: 'before.png' },
      { id: 'p2', photo_stage: 'DURING', file_url: 'during.png' },
      { id: 'p3', photo_stage: 'AFTER', file_url: 'after.png' },
    ]);

    const photos = await service.getPhotos('wo-1', 'company-1');

    expect(prisma.workOrderPhoto.findMany).toHaveBeenCalledWith({
      where: { work_order_id: 'wo-1', company_id: 'company-1' },
      orderBy: [{ photo_stage: 'asc' }, { created_at: 'asc' }],
    });
    expect(photos.map((photo) => photo.photo_stage)).toEqual(['BEFORE', 'DURING', 'AFTER']);
  });
});
