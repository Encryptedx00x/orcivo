import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const detail = readFileSync(new URL('./[id]/OrcamentoDetail.tsx', import.meta.url), 'utf8');
const easyQuotes = readFileSync(new URL('../../facil/screens/Quotes.tsx', import.meta.url), 'utf8');

test('modo completo distingue prévia interna e confirma download de DRAFT', () => {
  assert.match(detail, /quotePdfDeliveryPolicy\(quote\.status\)/);
  assert.match(detail, /Prévia interna de rascunho/);
  assert.match(detail, /Baixar prévia mesmo assim/);
  assert.match(detail, /pdfDelivery\.previewLabel/);
  assert.match(detail, /pdfDelivery\.downloadLabel/);
});

test('modo fácil usa o mesmo contrato e abre confirmação antes do download de DRAFT', () => {
  assert.match(easyQuotes, /quotePdfDeliveryPolicy\(q\.status\)/);
  assert.match(easyQuotes, /Prévia interna de rascunho/);
  assert.match(easyQuotes, /Baixar prévia mesmo assim/);
  assert.match(easyQuotes, /delivery\.downloadLabel/);
});
