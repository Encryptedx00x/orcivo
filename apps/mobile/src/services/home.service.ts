import { api } from './api';
import type { Appointment } from './appointment.service';
import type { HomeShortcut } from '@orcivo/shared-types';

export interface HomeSummary {
  company: { home_shortcuts?: HomeShortcut[] };
  kpis: {
    agenda_today: number;
    os_pending: number;
    quotes_pending: number;
    receivables_pending_count: number;
  };
  upcoming: Pick<Appointment, 'id' | 'title' | 'starts_at' | 'customer'>[];
}

export const homeService = {
  summary: () => api.get<HomeSummary>('/dashboard/summary'),
};
