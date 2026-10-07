import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { fetchOneWorkOrder, fetchWorkOrderPayments } from '../../../../lib/work-order.service';
import { WorkOrderDetail } from './WorkOrderDetail';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WorkOrderDetailPage(props: Props): Promise<React.JSX.Element> {
  const params = await props.params;
  try {
    const [order, paymentResult] = await Promise.all([
      fetchOneWorkOrder(params.id),
      fetchWorkOrderPayments(params.id).catch(() => ({ data: [] })),
    ]);
    return <WorkOrderDetail initial={order} payments={paymentResult.data} />;
  } catch {
    return (
      <div>
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            padding: '16px',
            color: '#DC2626',
          }}
        >
          Erro ao carregar a ordem de serviço. Verifique se o ID é válido e tente novamente.
        </div>
        <Link
          href="/ordens-de-servico"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 16,
            color: '#6D28D9',
            textDecoration: 'none',
            fontSize: 14,
          }}
        >
          <ArrowLeft size={16} /> Voltar às ordens
        </Link>
      </div>
    );
  }
}
