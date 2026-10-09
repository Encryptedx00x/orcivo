import {
  cleanWorkOrderDetails,
  describeWorkOrderDetails,
  WorkOrderDetailsSchema,
  WorkOrderFieldListSchema,
} from '../work-order/work-order-fields';

describe('work order fields', () => {
  it('prints filled fields in catalog order', () => {
    expect(describeWorkOrderDetails({ model: 'X1', brand: 'LG', serial_number: ' ' })).toEqual([
      { label: 'Marca', value: 'LG' },
      { label: 'Modelo', value: 'X1' },
    ]);
    expect(describeWorkOrderDetails(null)).toEqual([]);
  });

  it('rejects unknown keys and long values', () => {
    expect(WorkOrderDetailsSchema.safeParse({ brand: 'LG' }).success).toBe(true);
    expect(WorkOrderDetailsSchema.safeParse({ price: '10' }).success).toBe(false);
    expect(WorkOrderDetailsSchema.safeParse({ brand: 'x'.repeat(301) }).success).toBe(false);
    expect(WorkOrderFieldListSchema.safeParse(['brand', 'nope']).success).toBe(false);
  });

  it('trims configured values and removes blank details before saving', () => {
    expect(cleanWorkOrderDetails({ brand: ' LG ', model: '  ', capacity: '12.000 BTUs' })).toEqual({
      brand: 'LG',
      capacity: '12.000 BTUs',
    });
  });
});
