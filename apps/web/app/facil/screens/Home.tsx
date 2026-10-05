'use client';

import {
  Calendar,
  ChevronRight,
  ClipboardList,
  DollarSign,
  FileText,
  Plus,
  UserPlus,
} from 'lucide-react';
import { formatMoney } from '@orcivo/shared-types';
import { loadSummary } from '../actions';
import { emptyDraft, useLoad, useNav } from '../EasyApp';
import { C, ErrorBox, Loading, firstName, hhmm, longDate } from '../ui';

const tile: React.CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 24,
  background: '#FFFFFF',
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  textAlign: 'left',
  cursor: 'pointer',
  color: C.ink,
  fontFamily: 'inherit',
};
const iconBox: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 14,
  background: C.purple50,
  color: C.purple,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export function HomeScreen(): JSX.Element {
  const { go, tab, setDraft } = useNav();
  const { data, error, loading, reload } = useLoad(loadSummary);
  const now = new Date();
  const greet = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  const startQuote = () => {
    setDraft(emptyDraft());
    go('q1');
  };

  const today = (data?.upcoming ?? []).filter(
    (u) => new Date(u.starts_at).toDateString() === now.toDateString(),
  );
  const late = data?.kpis.receivables_overdue_count ?? 0;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 4px 0' }}>
        <span style={{ fontSize: 16, fontWeight: 500, color: C.fg3 }}>{longDate(now)}</span>
        <h1
          style={{
            margin: 0,
            fontSize: 30,
            lineHeight: '36px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          {greet}
          {data ? `, ${firstName(data.user.name)}` : ''}
        </h1>
      </div>

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorBox title="Não foi possível carregar o seu dia." onRetry={reload} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button
            type="button"
            onClick={startQuote}
            style={{
              gridColumn: 'span 2',
              minHeight: 128,
              border: 'none',
              borderRadius: 24,
              background: C.purple,
              color: '#FFFFFF',
              padding: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <span
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: 'rgba(255,255,255,0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Plus size={34} aria-hidden="true" />
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              <span
                style={{
                  fontSize: 22,
                  lineHeight: '28px',
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                }}
              >
                Novo orçamento
              </span>
              <span style={{ fontSize: 16, fontWeight: 500, color: C.purple100 }}>
                Pronto em 3 passos
              </span>
            </span>
            <ChevronRight size={28} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => tab('agenda')}
            style={{ ...tile, gridRow: 'span 2', gap: 6 }}
          >
            <span style={iconBox}>
              <Calendar size={24} aria-hidden="true" />
            </span>
            <span
              style={{
                fontSize: 44,
                lineHeight: '48px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
                marginTop: 6,
              }}
            >
              {data?.kpis.agenda_today ?? 0}
            </span>
            <span style={{ fontSize: 18, fontWeight: 700 }}>Hoje</span>
            <span
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                marginTop: 6,
                width: '100%',
              }}
            >
              {today.slice(0, 2).map((n) => (
                <span
                  key={n.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    paddingTop: 8,
                    borderTop: `1px solid ${C.line}`,
                  }}
                >
                  <span
                    style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {hhmm(new Date(n.starts_at))}
                  </span>
                  <span style={{ fontSize: 15, lineHeight: '20px', color: C.fg2 }}>{n.title}</span>
                </span>
              ))}
              {today.length === 0 && (
                <span style={{ fontSize: 15, color: C.fg3 }}>Nada marcado</span>
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={() => go('services')}
            style={{ ...tile, minHeight: 132, gap: 4 }}
          >
            <span style={iconBox}>
              <ClipboardList size={24} aria-hidden="true" />
            </span>
            <span
              style={{
                fontSize: 36,
                lineHeight: '42px',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                marginTop: 4,
              }}
            >
              {data?.kpis.os_pending ?? 0}
            </span>
            <span style={{ fontSize: 18, fontWeight: 700 }}>Serviços</span>
            <span style={{ fontSize: 15, color: C.fg3 }}>para fazer</span>
          </button>

          <button
            type="button"
            onClick={() => tab('quotes')}
            style={{ ...tile, minHeight: 132, gap: 4 }}
          >
            <span style={iconBox}>
              <FileText size={24} aria-hidden="true" />
            </span>
            <span
              style={{
                fontSize: 36,
                lineHeight: '42px',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                marginTop: 4,
              }}
            >
              {data?.kpis.quotes_pending ?? 0}
            </span>
            <span style={{ fontSize: 18, fontWeight: 700 }}>Orçamentos</span>
            <span style={{ fontSize: 15, color: C.fg3 }}>esperando resposta</span>
          </button>

          <button
            type="button"
            onClick={() => go('money')}
            style={{
              ...tile,
              gridColumn: 'span 2',
              minHeight: 104,
              padding: '16px 20px',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <span
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 4,
                flex: 1,
                minWidth: 0,
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 700 }}>A receber</span>
              <span
                style={{
                  fontSize: 30,
                  lineHeight: '38px',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatMoney(data?.kpis.receivables_pending_total ?? '0')}
              </span>
              {late > 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    height: 32,
                    padding: '0 12px',
                    borderRadius: 9999,
                    background: '#FEE2E2',
                    color: '#991B1B',
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: 9999, background: C.red }} />
                  {late} {late > 1 ? 'atrasados' : 'atrasado'}
                </span>
              )}
            </span>
            <ChevronRight size={24} color={C.fg4} aria-hidden="true" />
          </button>

          <span
            style={{
              gridColumn: 'span 2',
              fontSize: 17,
              fontWeight: 700,
              color: C.fg2,
              margin: '6px 4px 0',
            }}
          >
            Atalhos
          </span>
          <div
            style={{
              gridColumn: 'span 2',
              display: 'grid',
              gridTemplateColumns: 'repeat(4,1fr)',
              gap: 8,
            }}
          >
            {(
              [
                ['Cliente', UserPlus, () => go('clientNew')],
                ['Serviço', ClipboardList, () => go('services')],
                ['Agenda', Calendar, () => tab('agenda')],
                ['Recebido', DollarSign, () => go('money')],
              ] as const
            ).map(([label, Icon, onClick]) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                style={{
                  minHeight: 92,
                  border: `1px solid ${C.border}`,
                  borderRadius: 20,
                  background: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  color: C.purple,
                  padding: '8px 2px',
                  fontFamily: 'inherit',
                }}
              >
                <Icon size={28} aria-hidden="true" />
                <span style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
