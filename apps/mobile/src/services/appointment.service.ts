import { api, WriteOptions } from './api';
import type {
  AppointmentCreateDto,
  AppointmentPeriod,
  AppointmentStatus,
} from '@orcivo/shared-types';

export type { AppointmentCreateDto } from '@orcivo/shared-types';

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
  status: AppointmentStatus;
  schedule_period?: AppointmentPeriod | null;
  reminder_minutes?: number | null;
}

export interface AppointmentListResponse {
  data: Appointment[];
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
