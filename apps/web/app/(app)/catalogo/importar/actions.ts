'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '../../../../lib/api';
import { canImport, previewImport, type ImportFormat } from '../import-preview';

export type ImportResult = { error: string } | { created: number; updated: number; total: number };

export async function importCatalogAction(content: string, format: ImportFormat): Promise<ImportResult> {
  if (typeof content !== 'string' || !['csv', 'json'].includes(format)) {
    return { error: 'Arquivo inválido. Selecione um CSV ou JSON.' };
  }
  const preview = previewImport(content, format);
  if (!canImport(preview)) return { error: 'Corrija os erros da prévia antes de importar.' };
  try {
    const result = await apiFetch<{ created: number; updated: number; total: number }>('/catalog/import', {
      method: 'POST',
      body: JSON.stringify({ items: preview.rows.map(row => row.item) }),
    });
    revalidatePath('/catalogo');
    return { created: result.created, updated: result.updated, total: result.total };
  } catch {
    return { error: 'Não foi possível concluir a importação. Confira sua conexão e permissão de acesso e tente novamente.' };
  }
}
