import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { canImport, MAX_IMPORT_BYTES, previewImport } from './import-preview';
import { isLowStock, parseCatalogForm } from './inventory';

const product = { name: 'Sensor', type: 'PRODUCT', sale_price: '19.90', cost_price: '10.00', quantity: 3 };

test('CSV preview preserves decimal strings, quoted fields, BOM and CRLF', () => {
  const preview = previewImport('\uFEFFname,type,sale_price,cost_price,quantity,description\r\n"Sensor, HD",PRODUCT,19.90,10.00,3,"Linha 1\r\nLinha ""2"""\r\n', 'csv');
  assert.equal(canImport(preview), true);
  assert.deepEqual(preview.rows[0].item, {
    ...product, name: 'Sensor, HD', description: 'Linha 1\r\nLinha "2"', low_stock_threshold: 5, is_active: true,
  });
});

test('semicolon CSV and JSON envelopes produce the same import values', () => {
  const csv = previewImport('name;type;sale_price;cost_price;quantity\nSensor;PRODUCT;19.90;10.00;3', 'csv');
  const json = previewImport(JSON.stringify({ items: [product] }), 'json');
  assert.equal(canImport(json), true);
  assert.deepEqual(csv.rows[0].item, json.rows[0].item);
  assert.equal(canImport(previewImport(JSON.stringify([product]), 'json')), true);
});

test('preview exposes errors for each invalid row and blocks the whole import', () => {
  const preview = previewImport(JSON.stringify([product, { ...product, quantity: -1 }, { ...product, sale_price: 19.9 }]), 'json');
  assert.equal(preview.rows.length, 3);
  assert.equal(preview.rows[0].errors.length, 0);
  assert.match(preview.rows[1].errors.join(' '), /Quantidade/);
  assert.match(preview.rows[2].errors.join(' '), /Preço de venda/);
  assert.equal(canImport(preview), false);
});

test('rejects malformed files, missing or duplicate headers, mismatched columns and unknown fields', () => {
  const invalid: Array<[string, 'json' | 'csv']> = [
    ['', 'csv'], ['name,type,sale_price', 'csv'], ['name,type,name\nx,PRODUCT,10', 'csv'],
    ['name,type,sale_price\nx,PRODUCT', 'csv'], ['name,type,sale_price\n"x,PRODUCT,10', 'csv'],
    ['name,type,sale_price\n"x"oops,PRODUCT,10', 'csv'], ['name,quantity\nx,1', 'csv'],
    ['[', 'json'], ['null', 'json'], ['{}', 'json'], ['[]', 'json'], ['[null]', 'json'],
    [JSON.stringify([{ ...product, quantitty: 2 }]), 'json'],
    [JSON.stringify([{ ...product, name: '   ' }]), 'json'],
  ];
  for (const [content, format] of invalid) {
    assert.equal(canImport(previewImport(content, format)), false, content);
  }
});

test('enforces row, byte, stock integer and decimal storage limits', () => {
  assert.equal(canImport(previewImport(JSON.stringify(Array.from({ length: 1001 }, () => ({ name: 'x', type: 'PRODUCT', sale_price: '1' }))), 'json')), false);
  assert.match(previewImport('x'.repeat(MAX_IMPORT_BYTES + 1), 'csv').errors[0], /128 KB/);
  for (const extra of [{ quantity: null }, { quantity: true }, { quantity: [] }, { quantity: '' }, { quantity: 0.5 }, { quantity: 2147483648 }, { low_stock_threshold: 2147483648 }, { cost_price: '10000000000.00' }, { sale_price: '19.999' }, { unit_price: '20.00' }]) {
    assert.equal(canImport(previewImport(JSON.stringify([{ ...product, ...extra }]), 'json')), false);
  }
});

test('defaults, legacy price and inactive items are represented in the preview', () => {
  const preview = previewImport('name,type,unit_price,is_active\nSensor,PRODUCT,0.00,false', 'csv');
  assert.equal(canImport(preview), true);
  assert.deepEqual(preview.rows[0].item, { name: 'Sensor', type: 'PRODUCT', unit_price: '0.00', cost_price: '0', quantity: 0, low_stock_threshold: 5, is_active: false });
});

test('create and edit form payload preserves prices, zero stock, threshold and cleared optional fields', () => {
  const form = new FormData();
  for (const [key, value] of Object.entries({ name: ' Sensor ', type: 'PRODUCT', sale_price: '19,90', cost_price: '10,00', quantity: '0', low_stock_threshold: '2', is_active: 'true' })) form.set(key, value);
  assert.deepEqual(parseCatalogForm(form), { name: 'Sensor', type: 'PRODUCT', sale_price: '19.90', cost_price: '10.00', quantity: 0, low_stock_threshold: 2, is_active: true, description: '', unit: '' });
  form.delete('is_active');
  assert.equal(parseCatalogForm(form).is_active, false);
  for (const quantity of ['', '-1', '0.5', '2147483648']) {
    form.set('quantity', quantity);
    assert.throws(() => parseCatalogForm(form));
  }
});

test('low-stock flags use the server value with a product-only threshold fallback', () => {
  const item = { id: '1', name: 'Sensor', type: 'PRODUCT' as const, unit_price: '19.90', is_active: true, quantity: 5, low_stock_threshold: 5 };
  assert.equal(isLowStock(item), true);
  assert.equal(isLowStock({ ...item, quantity: 6 }), false);
  assert.equal(isLowStock({ ...item, quantity: 0 }), true);
  assert.equal(isLowStock({ ...item, type: 'SERVICE', is_low_stock: true }), false);
  assert.equal(isLowStock({ ...item, is_low_stock: false }), false);
  assert.equal(isLowStock({ ...item, quantity: undefined, low_stock_threshold: undefined }), false);
});
