import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { fetchOneWorkOrder } from '../../../../lib/work-order.service';
import { WorkOrderDetail } from './WorkOrderDetail';

interface Props {
  params: { id: string };
}

export default async function WorkOrderDetailPage({ params }: Props): Promise<JSX.Element> {
  try {
    const order = await fetchOneWorkOrder(params.id);
    return <WorkOrderDetail initial={order} />;
  } catch {
    return (
      <div>
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '16px', color: '#DC2626' }}>
          Erro ao carregar a ordem de serviço. Verifique se o ID é válido e tente novamente.
        </div>
        <Link
          href="/ordens-de-servico"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 16, color: '#6D28D9', textDecoration: 'none', fontSize: 14 }}
        >
          <ArrowLeft size={16} /> Voltar às ordens
        </Link>
      </div>
    );
  }
}
