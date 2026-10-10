import Link from 'next/link';
import { Download, FileArchive, BarChart3 } from 'lucide-react';
import { formatMoney } from '@orcivo/shared-types';
import { apiFetch } from '../../../lib/api';
import { DashboardLayout } from '../../../components/DashboardLayout';

interface Report {
  totals: { received: string; receivable: string; costs: string; result: string };
  by_payment_method: Array<{ method: string; label: string; amount: string }>;
  top_customers: Array<{ customer_id: string; name: string; amount: string }>;
  customers_by_origin: Array<{ origin: string; label: string; count: number }>;
}

const EXPORTS = [
  ['customers', 'Clientes'],
  ['quotes', 'Orçamentos'],
  ['work_orders', 'Ordens de serviço'],
  ['payments', 'Recebimentos'],
  ['expenses', 'Gastos'],
] as const;

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="ov-card ov-card-body" style={{ padding: 18 }}>
      <div style={{ color: '#64748B', fontSize: 13 }}>{label}</div>
      <strong
        style={{
          display: 'block',
          marginTop: 7,
          fontSize: 24,
          color: accent ? '#6D28D9' : '#0A0A0F',
        }}
      >
        {formatMoney(value)}
      </strong>
    </div>
  );
}

export default async function RelatoriosPage(): Promise<React.JSX.Element> {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth(), 1);
  const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  const report = await apiFetch<Report>(`/reports?${params}`).catch(() => null);
  return (
    <div className="ov-page" style={{ maxWidth: 1200 }}>
      <DashboardLayout>
        <header className="ov-page-header">
          <div>
            <h1>Relatórios</h1>
            <p style={{ color: '#64748B', margin: '6px 0 0' }}>
              Visão do mês atual para decisão da empresa.
            </p>
          </div>
        </header>
        {!report ? (
          <section className="ov-card ov-card-body" style={{ padding: 24 }}>
            <BarChart3 color="#6D28D9" size={28} />
            <h2 style={{ fontSize: 18 }}>Relatórios disponíveis no Orcivo Mais e Orcivo Equipe</h2>
            <p style={{ color: '#64748B' }}>
              Escolha um desses planos para acompanhar recebimentos, custos e origem de clientes.
            </p>
            <Link className="ov-btn ov-btn-primary" href="/plano">
              Ver planos
            </Link>
          </section>
        ) : (
          <>
            <div className="ov-grid-4" style={{ marginBottom: 20 }}>
              <Metric label="Recebido" value={report.totals.received} accent />
              <Metric label="A receber" value={report.totals.receivable} />
              <Metric label="Custos pagos" value={report.totals.costs} />
              <Metric label="Resultado" value={report.totals.result} accent />
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
                gap: 16,
              }}
            >
              <Table
                title="Recebido por forma de pagamento"
                rows={report.by_payment_method.map((row) => [row.label, formatMoney(row.amount)])}
              />
              <Table
                title="5 clientes que mais geraram recebimentos"
                rows={report.top_customers.map((row) => [row.name, formatMoney(row.amount)])}
                empty="Sem recebimentos no período."
              />
              <Table
                title="Novos clientes por origem"
                rows={report.customers_by_origin.map((row) => [row.label, String(row.count)])}
                empty="Sem novos clientes no período."
              />
            </div>
            <section className="ov-card ov-card-body" style={{ padding: 20, marginTop: 16 }}>
              <h2 style={{ fontSize: 17, marginTop: 0 }}>Portabilidade dos dados</h2>
              <p style={{ color: '#64748B', fontSize: 13 }}>
                Baixe seus dados em CSV ou todos os conjuntos em um arquivo ZIP.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {EXPORTS.map(([entity, label]) => (
                  <Link
                    key={entity}
                    className="ov-btn ov-btn-outline"
                    href={`/api/data-export/csv?entity=${entity}`}
                  >
                    <Download size={16} /> {label}
                  </Link>
                ))}
                <Link className="ov-btn ov-btn-primary" href="/api/data-export/zip">
                  <FileArchive size={16} /> Baixar tudo em ZIP
                </Link>
              </div>
            </section>
          </>
        )}
      </DashboardLayout>
    </div>
  );
}

function Table({
  title,
  rows,
  empty = 'Sem dados no período.',
}: {
  title: string;
  rows: string[][];
  empty?: string;
}) {
  return (
    <section className="ov-card">
      <div className="ov-card-body" style={{ padding: 18 }}>
        <h2 style={{ fontSize: 15, margin: '0 0 12px' }}>{title}</h2>
        {rows.length === 0 ? (
          <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>{empty}</p>
        ) : (
          rows.map(([label, value]) => (
            <div
              key={label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                padding: '8px 0',
                borderTop: '1px solid #F1F5F9',
                fontSize: 14,
              }}
            >
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
