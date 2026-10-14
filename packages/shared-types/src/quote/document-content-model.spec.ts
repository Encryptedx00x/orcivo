import {
  QuoteCreateSchema,
  CompanyProfileUpdateSchema,
  ReceiptDocOptionsSchema,
  calculateQuoteCategorySubtotals,
  resolveReceiptDocOptions,
} from '..';

describe('document content model', () => {
  it('keeps old quote item payloads compatible and accepts frozen type/unit', () => {
    const base = {
      customer_id: '11111111-1111-4111-8111-111111111111',
      items: [{ description: 'Instalação', quantity: '1', unit_price: '100.00' }],
    };
    expect(QuoteCreateSchema.parse(base).items[0]).toMatchObject({ description: 'Instalação' });
    expect(
      QuoteCreateSchema.parse({
        ...base,
        items: [{ ...base.items[0], item_type: 'PRODUCT', unit: 'm²' }],
      }).items[0],
    ).toMatchObject({ item_type: 'PRODUCT', unit: 'm²' });
  });

  it('calculates service and product subtotals only with decimal strings', () => {
    expect(
      calculateQuoteCategorySubtotals([
        { item_type: 'SERVICE', quantity: '1.5', unit_price: '100.10' },
        { item_type: 'PRODUCT', quantity: '3', unit_price: '0.20' },
      ]),
    ).toEqual({ serviceSubtotal: '150.15', productSubtotal: '0.60', subtotal: '150.75' });
  });

  it('defaults old receipts to complete and rejects unknown visibility keys', () => {
    expect(resolveReceiptDocOptions()).toEqual({
      company_details: true,
      client_details: true,
      payment_details: true,
      additional_info: true,
      pix: true,
      footer: true,
    });
    expect(resolveReceiptDocOptions({ pix: false }).pix).toBe(false);
    expect(ReceiptDocOptionsSchema.safeParse({ amount: false }).success).toBe(false);
    expect(
      CompanyProfileUpdateSchema.parse({ receipt_default_doc_options: { pix: false } }),
    ).toMatchObject({ receipt_default_doc_options: { pix: false } });
  });
});
