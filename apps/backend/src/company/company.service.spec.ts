import { NotFoundException } from '@nestjs/common';
import { CompanyService } from './company.service';

const mockPrisma = { company: { findUnique: jest.fn() } };
const mockAudit = { record: jest.fn() };

describe('CompanyService', () => {
  let service: CompanyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CompanyService(mockPrisma as never, mockAudit as never);
  });

  it('retorna a empresa quando existe', async () => {
    const company = { id: 'c1', trade_name: 'Elétrica Silva', plan_code: 'LIVRE' };
    mockPrisma.company.findUnique.mockResolvedValue(company);
    const result = await service.findCurrent('c1');
    expect(result).toEqual(company);
    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1' } }),
    );
  });

  it('lança NotFoundException quando empresa não existe', async () => {
    mockPrisma.company.findUnique.mockResolvedValue(null);
    await expect(service.findCurrent('non-existent')).rejects.toThrow(NotFoundException);
  });
});
