import { CatalogImportRowSchema, type CatalogImportRowDto } from '@orcivo/shared-types';

export type ImportFormat = 'csv' | 'json';
export type PreviewRow = {
  line: number;
  name: string;
  item?: CatalogImportRowDto;
  errors: string[];
};
export type ImportPreview = { rows: PreviewRow[]; errors: string[] };
// Leave room for JSON escaping under Next's default 1 MB server-action limit.
export const MAX_IMPORT_BYTES = 128_000;

const labels: Record<string, string> = {
  name: 'Nome', description: 'Descrição', type: 'Tipo', unit: 'Unidade',
  unit_price: 'Preço unitário', sale_price: 'Preço de venda', cost_price: 'Preço de custo',
  quantity: 'Quantidade', low_stock_threshold: 'Limite de estoque baixo', is_active: 'Ativo',
};

// Match the database bounds as well as the shared API schema.
export function inventoryRangeErrors(item: CatalogImportRowDto): string[] {
  const errors: string[] = [];
  for (const field of ['quantity', 'low_stock_threshold'] as const) {
    if (item[field] > 2_147_483_647) errors.push(`${labels[field]}: máximo de 2147483647.`);
  }
  for (const field of ['unit_price', 'sale_price', 'cost_price'] as const) {
    if ((item[field]?.split('.')[0].replace(/^0+/, '').length ?? 0) > 10) {
      errors.push(`${labels[field]}: máximo de 9999999999.99.`);
    }
  }
  return errors;
}

function validateRow(raw: unknown, line: number): PreviewRow {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { line, name: 'Item inválido', errors: ['Cada item deve ser um objeto.'] };
  }
  const source = raw as Record<string, unknown>;
  const name = typeof source.name === 'string' ? source.name : 'Sem nome';
  const errors = Object.keys(source)
    .filter(key => !Object.hasOwn(labels, key))
    .map(key => `Campo desconhecido: ${key}.`);
  for (const field of ['quantity', 'low_stock_threshold']) {
    const value = source[field];
    if (value !== undefined && (typeof value !== 'number' && typeof value !== 'string' || typeof value === 'string' && !value.trim())) {
      errors.push(`${labels[field]}: use um número inteiro maior ou igual a zero.`);
    }
  }
  const parsed = CatalogImportRowSchema.safeParse(source);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]);
      const hints: Record<string, string> = {
        name: 'informe de 1 a 200 caracteres.',
        description: 'use até 1000 caracteres.',
        type: 'use PRODUCT (produto) ou SERVICE (serviço).',
        unit: 'use até 20 caracteres.',
        quantity: 'use um número inteiro maior ou igual a zero.',
        low_stock_threshold: 'use um número inteiro maior ou igual a zero.',
        is_active: 'use true ou false.',
      };
      errors.push(`${labels[field] ?? field}: ${hints[field] ?? 'use texto decimal, como "19.90"; informe o preço de venda e mantenha unit_price igual a sale_price se usar ambos.'}`);
    }
    return { line, name, errors };
  }
  if (!parsed.data.name.trim()) errors.push('Nome: informe um nome que não seja vazio.');
  errors.push(...inventoryRangeErrors(parsed.data));
  return { line, name, item: parsed.data, errors };
}

function csvRecords(input: string): string[][] {
  const delimiter = input.split(/\r?\n/, 1)[0].includes(';') ? ';' : ',';
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;
  let closedQuote = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') { quoted = false; closedQuote = true; }
      else field += char;
    } else if (char === delimiter) {
      record.push(field); field = ''; closedQuote = false;
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i++;
      record.push(field); records.push(record);
      record = []; field = ''; closedQuote = false;
    } else if (char === '"' && field === '' && !closedQuote) {
      quoted = true;
    } else {
      if (char === '"' || (closedQuote && char.trim() !== '')) {
        throw new Error('CSV contém aspas em posição inválida.');
      }
      field += char;
    }
  }
  if (quoted) throw new Error('CSV contém aspas não fechadas.');
  if (field.length || record.length || closedQuote) { record.push(field); records.push(record); }
  return records;
}

export function previewImport(content: string, format: ImportFormat): ImportPreview {
  if (new TextEncoder().encode(content).length > MAX_IMPORT_BYTES) {
    return { rows: [], errors: ['O arquivo deve ter no máximo 128 KB.'] };
  }
  const text = content.replace(/^\uFEFF/, '').trim();
  if (!text) return { rows: [], errors: ['Selecione um arquivo com pelo menos um item.'] };
  try {
    let rows: PreviewRow[];
    if (format === 'json') {
      let parsed: unknown;
      try { parsed = JSON.parse(text); }
      catch { return { rows: [], errors: ['JSON inválido. Confira as aspas, vírgulas e colchetes.'] }; }
      const items = Array.isArray(parsed) ? parsed : (parsed as { items?: unknown } | null)?.items;
      if (!Array.isArray(items)) return { rows: [], errors: ['Use uma lista JSON ou um objeto com a lista "items".'] };
      if (!items.length || items.length > 1000) return { rows: [], errors: ['Importe de 1 a 1000 itens por arquivo.'] };
      rows = items.map((item, index) => validateRow(item, index + 1));
    } else {
      const records = csvRecords(text);
      const headers = records[0].map(header => header.trim().toLowerCase());
      if (new Set(headers).size !== headers.length || headers.some(header => !Object.hasOwn(labels, header))) {
        return { rows: [], errors: ['Use cabeçalhos únicos e apenas as colunas do modelo CSV.'] };
      }
      if (!headers.includes('name') || !headers.includes('type')) {
        return { rows: [], errors: ['O CSV deve incluir as colunas name e type.'] };
      }
      const recordsWithLines = records.slice(1).map((record, index) => ({ record, line: index + 2 }))
        .filter(({ record }) => record.some(value => value.trim() !== ''));
      if (!recordsWithLines.length || recordsWithLines.length > 1000) return { rows: [], errors: ['Importe de 1 a 1000 itens por arquivo.'] };
      rows = recordsWithLines.map(({ record, line }) => {
        if (record.length !== headers.length) return { line, name: 'Item inválido', errors: ['Quantidade de colunas diferente do cabeçalho.'] };
        const raw = Object.fromEntries(headers.map((header, index) => [header, record[index].trim()])
          .filter(([, value]) => value !== ''));
        return validateRow(raw, line);
      });
    }
    return { rows, errors: [] };
  } catch (error) {
    return { rows: [], errors: [error instanceof Error ? error.message : 'Não foi possível ler o arquivo.'] };
  }
}

export function canImport(preview: ImportPreview): boolean {
  return !preview.errors.length && preview.rows.length > 0 && preview.rows.every(row => row.item && !row.errors.length);
}
