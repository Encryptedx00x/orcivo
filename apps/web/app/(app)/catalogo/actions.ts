'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { catalogService } from '../../../lib/catalog.service';
import { parseCatalogForm } from './inventory';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

function selectedPhoto(formData: FormData): File | null {
  const photo = formData.get('photo');
  return photo instanceof File && photo.size > 0 ? photo : null;
}

async function uploadCatalogPhoto(itemId: string, photo: File): Promise<void> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) throw new Error('Not authenticated');

  const payload = new FormData();
  payload.append('file', photo);
  const response = await fetch(`${API_URL}/catalog/${itemId}/photo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: payload,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Photo upload failed');
}

async function removeCatalogPhoto(itemId: string): Promise<void> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/catalog/${itemId}/photo`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Photo removal failed');
}

export async function createCatalogItemAction(_previous: { error: string }, formData: FormData) {
  try {
    const item = await catalogService.createItem(parseCatalogForm(formData));
    const photo = selectedPhoto(formData);
    if (photo) await uploadCatalogPhoto(item.id, photo);
  } catch {
    return {
      error:
        'Não foi possível salvar. Confira os campos, sua conexão e permissão de acesso e tente novamente.',
    };
  }
  revalidatePath('/catalogo');
  redirect('/catalogo');
}

export async function updateCatalogItemAction(
  id: string,
  _previous: { error: string },
  formData: FormData,
) {
  try {
    await catalogService.updateItem(id, parseCatalogForm(formData));
    const photo = selectedPhoto(formData);
    if (photo) await uploadCatalogPhoto(id, photo);
    else if (formData.get('remove_photo') === 'true') await removeCatalogPhoto(id);
  } catch {
    return {
      error:
        'Não foi possível salvar. Confira os campos, sua conexão e permissão de acesso e tente novamente.',
    };
  }
  revalidatePath('/catalogo');
  revalidatePath(`/catalogo/${id}/editar`);
  redirect('/catalogo');
}
