import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { fetchAllWorkOrders, WorkOrder } from '../../../lib/work-order.service';

function statusLabel(status: WorkOrder['status']): string {
  const map: Record<WorkOrder['status'], string> = {
    PENDING: 'Pendente',
    IN_PROGRESS: 'Em andamento',
    DONE: 'Concluída',
    CANCELLED: 'Cancelada',
  };
  return map[status];
}

function statusBadgeStyle(status: WorkOrder['status']): React.CSSProperties {
  const styles: Record<WorkOrder['status'], React.CSSProperties> = {
    PENDING: { backgroundColor: '#FEF3C7', color: '#92400E' },
    IN_PROGRESS: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
    DONE: { backgroundColor: '#D1FAE5', color: '#065F46' },
    CANCELLED: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  };
  return {
    ...styles[status],
    display: 'inline-block', padding: '2px 10px',
    borderRadius: 20, fontSize: 12, fontWeight: 600,
  };
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default async function OrdensDeServicoPage(): Promise<JSX.Element> {
  let orders: WorkOrder[] = [];
  let error = false;

  try {
    const result = await fetchAllWorkOrders(1);
    orders = result.data ?? [];
  } catch {
    error = true;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0F' }}>Ordens de Serviço</h1>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 16px', color: '#DC2626', marginBottom: 16 }}>
          Erro ao carregar ordens de serviço. Tente novamente mais tarde.
        </div>
      )}

      {!error && orders.length === 0 && (
        <div style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '32px 16px', textAlign: 'center', color: '#6B7280' }}>
          <ClipboardList size={40} style={{ margin: '0 auto 12px', color: '#D1D5DB', display: 'block' }} />
          <p style={{ fontWeight: 600 }}>Nenhuma ordem de serviço encontrada.</p>
          <p style={{ fontSize: 14 }}>As ordens são criadas pelo aplicativo mobile pelos técnicos em campo.</p>
        </div>
      )}

      {!error && orders.length > 0 && (
        <div style={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                <th style={th}>Número</th>
                <th style={th}>Título</th>
                <th style={th}>Cliente</th>
                <th style={th}>Status</th>
                <th style={th}>Agendamento</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={td}>
                    <Link
                      href={`/ordens-de-servico/${order.id}`}
                      style={{ color: '#6D28D9', fontWeight: 700, textDecoration: 'none' }}
                    >
                      #{order.number}
                    </Link>
                  </td>
                  <td style={td}>
                    <Link
                      href={`/ordens-de-servico/${order.id}`}
                      style={{ color: '#0A0A0F', textDecoration: 'none', fontWeight: 500 }}
                    >
                      {order.title}
                    </Link>
                  </td>
                  <td style={td}>{order.customer.name}</td>
                  <td style={td}>
                    <span style={statusBadgeStyle(order.status)}>
                      {statusLabel(order.status)}
                    </span>
                  </td>
                  <td style={td}>{formatDate(order.scheduled_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '12px 16px', fontSize: 13, color: '#6B7280', fontWeight: 600 };
const td: React.CSSProperties = { padding: '12px 16px', fontSize: 14, color: '#0A0A0F' };
