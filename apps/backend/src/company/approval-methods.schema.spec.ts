import { ApprovalMethodsSchema, CompanyProfileUpdateSchema } from './company-profile-update.schema';

describe('ApprovalMethodsSchema', () => {
  it('accepts the four supported methods and drops duplicates', () => {
    const r = ApprovalMethodsSchema.parse({
      methods: ['PHOTO_SIGNATURE', 'APPROVE_BUTTON', 'APPROVE_BUTTON'],
    });
    expect(r.methods).toEqual(['PHOTO_SIGNATURE', 'APPROVE_BUTTON']);
  });

  it('rejects an empty list and unknown methods', () => {
    expect(ApprovalMethodsSchema.safeParse({ methods: [] }).success).toBe(false);
    expect(ApprovalMethodsSchema.safeParse({ methods: ['WHATEVER'] }).success).toBe(false);
    expect(ApprovalMethodsSchema.safeParse({}).success).toBe(false);
  });
});

describe('CompanyProfileUpdateSchema quote defaults', () => {
  it('accepts terms and a validity between 1 and 365 days', () => {
    expect(
      CompanyProfileUpdateSchema.safeParse({
        quote_default_terms: 'x',
        quote_default_validity_days: 15,
      }).success,
    ).toBe(true);
    expect(CompanyProfileUpdateSchema.safeParse({ quote_default_validity_days: 0 }).success).toBe(
      false,
    );
    expect(CompanyProfileUpdateSchema.safeParse({ quote_default_validity_days: 400 }).success).toBe(
      false,
    );
  });
});
