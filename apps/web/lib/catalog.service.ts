import { apiFetch } from './api';
import type { CatalogItemCreateDto, CatalogItemUpdateDto } from '@orcivo/shared-types';

export interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  type: 'SERVICE' | 'PRODUCT';
  unit_price: string; // string decimal — nunca number/float
  unit?: string;
  is_active: boolean;
}

export const catalogService = {
  fetchCatalog: (onlyActive = true) =>
    apiFetch<CatalogItem[]>(`/catalog${onlyActive ? '' : '?all=true'}`),

  createItem: (dto: CatalogItemCreateDto) =>
    apiFetch<CatalogItem>('/catalog', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  updateItem: (id: string, dto: CatalogItemUpdateDto) =>
    apiFetch<CatalogItem>(`/catalog/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),

  deactivateItem: (id: string) =>
    apiFetch<void>(`/catalog/${id}`, { method: 'DELETE' }),
};
