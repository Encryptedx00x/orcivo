import type {
  WorkOrderAction,
  WorkOrderAssignableMember,
  WorkOrderStatus,
} from '@orcivo/shared-types';
import { api, WriteOptions } from './api';

// X-Client-Request-Id incluido automaticamente via api.post / api.patch (interceptor em api.ts)

export interface WorkOrderCustomer {
  id: string;
  name: string;
  phone?: string | null;
}

export interface WorkOrderPhoto {
  id: string;
  photo_stage: 'BEFORE' | 'DURING' | 'AFTER';
  file_url: string;
  caption?: string;
}

export interface WorkOrder {
  id: string;
  number: number;
  title: string;
  /** União publicada no shared-types (inclui os extras AWAITING_PAYMENT/WARRANTY). */
  status: WorkOrderStatus;
  /** Ações liberadas pelo backend (estado + papel + status extras da empresa). */
  allowed_actions?: readonly WorkOrderAction[];
  customer: WorkOrderCustomer;
  assigned_to?: { id: string; name: string } | null;
  scheduled_at?: string;
  finished_at?: string | null;
  notes?: string | null;
  details?: Partial<Record<string, string>> | null;
  /** The value of a work order is its approved quote's total. */
  quote?: { id: string; number: number; total?: string } | null;
  photos: WorkOrderPhoto[];
}

export interface WorkOrderListResponse {
  data: WorkOrder[];
  page: number;
  total?: number;
}

export const workOrderService = {
  async fetchAll(page = 1, search = '', limit = 20): Promise<WorkOrderListResponse> {
    const term = search.trim();
    const query = `page=${page}&limit=${limit}${term ? `&search=${encodeURIComponent(term)}` : ''}`;
    return api.get<WorkOrderListResponse>(`/work-orders?${query}`);
  },

  async fetchOne(id: string): Promise<WorkOrder> {
    return api.get<WorkOrder>(`/work-orders/${id}`);
  },

  async listAssignableMembers(): Promise<WorkOrderAssignableMember[]> {
    return api.get<WorkOrderAssignableMember[]>('/work-orders/assignable-members');
  },

  async updateResponsible(id: string, userId: string | null): Promise<WorkOrder> {
    return api.patch<WorkOrder>(`/work-orders/${id}`, { assigned_to_user_id: userId });
  },

  async updateStatus(id: string, status: string, opts?: WriteOptions): Promise<WorkOrder> {
    return api.patch<WorkOrder>(`/work-orders/${id}`, { status }, opts);
  },

  async uploadPhoto(
    workOrderId: string,
    fileUri: string,
    stage: 'BEFORE' | 'DURING' | 'AFTER',
    caption?: string,
    opts?: WriteOptions,
  ): Promise<WorkOrderPhoto> {
    const mimeType = fileUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';

    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type: mimeType,
      name: `photo.${ext}`,
    } as unknown as Blob);
    formData.append('stage', stage);
    if (caption) formData.append('caption', caption);

    // Validar stage antes de enviar (T-2A-23 mitigation)
    const VALID_STAGES = ['BEFORE', 'DURING', 'AFTER'];
    if (!VALID_STAGES.includes(stage)) {
      throw new Error(`Stage inválido: ${stage}`);
    }

    return api.postFormData<WorkOrderPhoto>(`/work-orders/${workOrderId}/photos`, formData, opts);
  },
};
