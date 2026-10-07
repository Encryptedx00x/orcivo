'use client';

import {
  CheckCircle,
  ClipboardList,
  DollarSign,
  FileText,
  FolderOpen,
  LogOut,
  Package,
  ReceiptText,
  Settings,
  Star,
} from 'lucide-react';
import { loadSummary } from '../actions';
import { useLoad, useNav } from '../EasyApp';
import { H1 } from '../ui';
import { MenuRow, box } from '../rows';
import { useSheet } from '../sheet';

const PLANS: Array<[string, string]> = [
  ['LIVRE', 'Orcivo Livre'],
  ['SOLO', 'Orcivo Solo'],
  ['MAIS', 'Orcivo Mais'],
  ['EQUIPE', 'Orcivo Equipe'],
];

export function MenuScreen(): React.JSX.Element {
  const { go, tab } = useNav();
  const sheet = useSheet();
  const summary = useLoad(loadSummary);
  const pending = summary.data?.kpis.os_pending;
  const plan = summary.data?.company.plan_code ?? 'LIVRE';
  const planName = PLANS.find(([k]) => k === plan)?.[1] ?? 'Orcivo Livre';

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <>
      <div style={{ padding: '8px 4px 0' }}>
        <H1>Menu</H1>
      </div>
      <div style={box}>
        <MenuRow
          icon={ClipboardList}
          label="Serviços de hoje"
          sub={pending !== undefined ? `${pending} para fazer` : 'O que fazer hoje'}
          onClick={() => go('services')}
        />
        <MenuRow
          icon={DollarSign}
          label="Financeiro"
          sub="Recebido e a receber"
          onClick={() => go('money')}
        />
        <MenuRow
          icon={ReceiptText}
          label="Recibos"
          sub="Gerados ao receber um pagamento"
          onClick={() => go('receipts')}
        />
        <MenuRow
          icon={FolderOpen}
          label="Documentos"
          sub="Orçamentos, serviços e recibos"
          onClick={() =>
            sheet({
              title: 'Documentos',
              sub: 'Escolha o tipo',
              actions: [
                { label: 'Orçamentos', icon: FileText, run: () => tab('quotes') },
                { label: 'Serviços', icon: ClipboardList, run: () => go('services') },
                { label: 'Recibos', icon: ReceiptText, run: () => go('receipts') },
                {
                  label: 'Todos os PDFs',
                  sub: 'Lista completa para baixar',
                  icon: FolderOpen,
                  run: () => (window.location.href = '/documentos'),
                },
              ],
            })
          }
        />
        <MenuRow
          icon={Package}
          label="Meus serviços e preços"
          sub="Itens e preços dos orçamentos"
          onClick={() => go('catalog')}
        />
        <MenuRow
          icon={Settings}
          label="Configurações"
          sub="Modo fácil, empresa, Pix, aprovação"
          onClick={() => go('settings')}
        />
        <MenuRow
          icon={Star}
          label="Meu plano"
          sub={planName}
          last
          onClick={() =>
            sheet({
              title: 'Meu plano',
              sub: `Você está no ${planName}`,
              actions: PLANS.map(([k, name]) => ({
                label: k === plan ? `${name} · atual` : name,
                icon: k === plan ? CheckCircle : Star,
                run: () => (window.location.href = '/plano'),
              })),
            })
          }
        />
      </div>
      <div style={box}>
        <MenuRow
          icon={LogOut}
          label="Sair"
          danger
          last
          onClick={() =>
            // Same as the app: a stray tap must not end the session.
            sheet({
              title: 'Sair da sua conta?',
              sub: 'Você entra de novo com seu e-mail e senha.',
              actions: [{ label: 'Sair', icon: LogOut, danger: true, run: () => void logout() }],
            })
          }
        />
      </div>
    </>
  );
}
