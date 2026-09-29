import { api, WriteOptions } from './api';

// X-Client-Request-Id incluido automaticamente via api.post / api.patch (interceptor em api.ts)

export type AppointmentType =
  | 'VISITA'
  | 'INSTALACAO'
  | 'ORCAMENTO'
  | 'MANUTENCAO'
  | 'REUNIAO'
  | 'OUTRO';

export interface AppointmentCustomer {
  id: string;
  name: string;
}

export interface Appointment {
  id: string;
  title: string;
  type: AppointmentType;
  notes?: string | null;
  starts_at: string;
  ends_at?: string | null;
  customer_id?: string | null;
  work_order_id?: string | null;
  customer?: AppointmentCustomer | null;
}

export interface AppointmentListResponse {
  data: Appointment[];
}

export interface AppointmentCreateDto {
  title: string;
  type?: AppointmentType;
  customer_id?: string;
  work_order_id?: string;
  notes?: string;
  starts_at: string;
  ends_at?: string;
}

export const appointmentService = {
  async fetchAppointments(from?: string, to?: string): Promise<AppointmentListResponse> {
    const parts: string[] = [];
    if (from) parts.push(`from=${encodeURIComponent(from)}`);
    if (to) parts.push(`to=${encodeURIComponent(to)}`);
    const qs = parts.join('&');
    return api.get<AppointmentListResponse>(`/appointments${qs ? `?${qs}` : ''}`);
  },

  async createAppointment(dto: AppointmentCreateDto, opts?: WriteOptions): Promise<Appointment> {
    return api.post<Appointment>('/appointments', dto, opts);
  },
};
