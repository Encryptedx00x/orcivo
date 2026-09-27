'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { catalogService } from '../../../lib/catalog.service';
import { parseCatalogForm } from './inventory';

export async function createCatalogItemAction(_previous: { error: string }, formData: FormData) {
  try {
    await catalogService.createItem(parseCatalogForm(formData));
  } catch {
    return { error: 'Não foi possível salvar. Confira os campos, sua conexão e permissão de acesso e tente novamente.' };
  }
  revalidatePath('/catalogo');
  redirect('/catalogo');
}

export async function updateCatalogItemAction(id: string, _previous: { error: string }, formData: FormData) {
  try {
    await catalogService.updateItem(id, parseCatalogForm(formData));
  } catch {
    return { error: 'Não foi possível salvar. Confira os campos, sua conexão e permissão de acesso e tente novamente.' };
  }
  revalidatePath('/catalogo');
  redirect('/catalogo');
}
