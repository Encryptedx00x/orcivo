import { api, WriteOptions } from './api';
import { CatalogItemCreateDto, CatalogItemUpdateDto } from '@orcivo/shared-types';

// X-Client-Request-Id incluido automaticamente via api.post / api.patch / api.delete (interceptor em api.ts)

export interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  type: 'SERVICE' | 'PRODUCT';
  unit_price: string; // string decimal — nunca number
  unit?: string;
  is_active: boolean;
}

export const catalogService = {
  async fetchCatalog(onlyActive = true): Promise<CatalogItem[]> {
    const query = onlyActive ? '' : '?all=true';
    return api.get<CatalogItem[]>(`/catalog${query}`);
  },

  async createItem(dto: CatalogItemCreateDto, opts?: WriteOptions): Promise<CatalogItem> {
    return api.post<CatalogItem>('/catalog', dto, opts);
  },

  async updateItem(
    id: string,
    dto: CatalogItemUpdateDto,
    opts?: WriteOptions,
  ): Promise<CatalogItem> {
    return api.patch<CatalogItem>(`/catalog/${id}`, dto, opts);
  },

  async deactivateItem(id: string, opts?: WriteOptions): Promise<void> {
    await api.delete<void>(`/catalog/${id}`, opts);
  },
};
