'use client';

import {
  ChevronRight,
  ClipboardList,
  DollarSign,
  FolderOpen,
  LogOut,
  Package,
  Settings,
  Smile,
  Star,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { setEasyMode } from '../../../components/EasyMode';
import { loadSummary } from '../actions';
import { useLoad, useNav } from '../EasyApp';
import { C, H1, Toggle } from '../ui';

const PLAN: Record<string, string> = {
  LIVRE: 'Orcivo Livre',
  SOLO: 'Orcivo Solo',
  MAIS: 'Orcivo Mais',
  EQUIPE: 'Orcivo Equipe',
};

function Row({
  icon: Icon,
  label,
  sub,
  onClick,
  href,
}: {
  icon: LucideIcon;
  label: string;
  sub: string;
  onClick?: () => void;
  href?: string;
}) {
  const inner = (
    <>
      <span
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: C.purple50,
          color: C.purple,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={24} aria-hidden="true" />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 18, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 15, color: C.fg3 }}>{sub}</span>
      </span>
      <ChevronRight size={24} color={C.fg4} aria-hidden="true" />
    </>
  );
  const style: React.CSSProperties = {
    width: '100%',
    minHeight: 76,
    border: 'none',
    borderBottom: `1px solid ${C.line}`,
    background: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '10px 16px',
    textAlign: 'left',
    cursor: 'pointer',
    color: C.ink,
    textDecoration: 'none',
    fontFamily: 'inherit',
  };
  return href ? (
    <a href={href} style={style}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={onClick} style={style}>
      {inner}
    </button>
  );
}

export function MenuScreen(): JSX.Element {
  const { go } = useNav();
  const summary = useLoad(loadSummary);
  const pending = summary.data?.kpis.os_pending;
  const box: React.CSSProperties = {
    borderRadius: 24,
    background: '#FFFFFF',
    border: `1px solid ${C.border}`,
    overflow: 'hidden',
  };

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
        <Row
          icon={ClipboardList}
          label="Serviços de hoje"
          sub={pending !== undefined ? `${pending} para fazer` : 'O que fazer hoje'}
          onClick={() => go('services')}
        />
        <Row
          icon={DollarSign}
          label="Financeiro"
          sub="Recebido e a receber"
          onClick={() => go('money')}
        />
        <Row icon={Package} label="Meus serviços e preços" sub="Lista completa" href="/catalogo" />
        <Row
          icon={FolderOpen}
          label="Documentos"
          sub="Orçamentos e serviços em PDF"
          href="/documentos"
        />
        <Row icon={UserPlus} label="Equipe" sub="Membros e convites" href="/equipe" />
        <Row
          icon={Settings}
          label="Minha empresa e configurações"
          sub="Nome, logo, Pix, aprovação e mais"
          href="/configuracoes"
        />
        <Row
          icon={Star}
          label="Meu plano"
          sub={
            summary.data
              ? (PLAN[summary.data.company.plan_code] ?? 'Orcivo Livre')
              : 'Plano e assinatura'
          }
          href="/plano"
        />
      </div>
      <div style={box}>
        <div
          style={{
            padding: '10px 16px',
            borderBottom: `1px solid ${C.line}`,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <span
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: C.purple50,
              color: C.purple,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Smile size={24} aria-hidden="true" />
          </span>
          <Toggle
            on
            label="Modo fácil"
            sub="Ligado neste aparelho"
            onClick={() => {
              setEasyMode(false);
              window.location.href = '/dashboard';
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          style={{
            width: '100%',
            minHeight: 72,
            border: 'none',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '10px 16px',
            textAlign: 'left',
            cursor: 'pointer',
            color: '#B91C1C',
            fontFamily: 'inherit',
          }}
        >
          <span
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: '#FEF2F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <LogOut size={24} aria-hidden="true" />
          </span>
          <span style={{ fontSize: 18, fontWeight: 600 }}>Sair</span>
        </button>
      </div>
    </>
  );
}
