'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, ChevronDown, CreditCard, LogOut, Menu, Settings, Smile } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useMobileSidebar } from './MobileSidebar';
import { BrandMark } from './BrandMark';
import { useEasyMode } from './EasyMode';

const menuItem: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  minHeight: 44,
  padding: '0 10px',
  border: 0,
  borderRadius: 8,
  background: 'transparent',
  color: '#0A0A0F',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  textAlign: 'left',
};

interface NotificationItem {
  id: string;
  human_text: string;
  created_at: string;
  read_at: string | null;
}

interface NotificationPage {
  data: NotificationItem[];
  unread_count: number;
}

function notificationTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function TopBar(): JSX.Element {
  const router = useRouter();
  const { company } = useAuth();
  const { toggle } = useMobileSidebar();
  const companyName = company?.trade_name;
  const feedId = useId();
  const feed = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const menu = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [easyOn, setEasy] = useEasyMode();

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menu.current && !menu.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=12', { cache: 'no-store' });
      if (!response.ok) throw new Error('Não foi possível carregar as notificações.');
      const page = (await response.json()) as NotificationPage;
      setNotifications(page.data);
      setUnreadCount(page.unread_count);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Notificações indisponíveis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
    const poll = window.setInterval(() => void loadNotifications(), 60_000);
    return () => window.clearInterval(poll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (feed.current && !feed.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const markRead = async (id: string) => {
    const item = notifications.find((notification) => notification.id === id);
    if (!item || item.read_at) return;
    try {
      const response = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      if (!response.ok) throw new Error('Não foi possível marcar a notificação como lida.');
      const result = (await response.json()) as { read_at: string };
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id ? { ...notification, read_at: result.read_at } : notification,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
      setError('');
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Não foi possível atualizar a notificação.',
      );
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <header
      className="ov-topbar"
      style={{
        height: 64,
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        backgroundColor: '#FFFFFF',
        flexShrink: 0,
        gap: 16,
      }}
    >
      <button
        type="button"
        className="ov-hamburger"
        aria-label="Abrir menu"
        onClick={toggle}
        style={{
          background: 'none',
          border: 'none',
          borderRadius: 10,
          width: 40,
          height: 40,
          flexShrink: 0,
          cursor: 'pointer',
          color: '#334155',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Menu size={20} />
      </button>

      <span className="ov-show-mobile" style={{ marginLeft: 4 }}>
        <BrandMark size={26} />
      </span>
      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div ref={feed} style={{ position: 'relative' }}>
          <button
            type="button"
            aria-label={unreadCount ? `${unreadCount} notificações não lidas` : 'Notificações'}
            aria-expanded={open}
            aria-controls={feedId}
            title="Notificações"
            onClick={() => setOpen((current) => !current)}
            style={{
              position: 'relative',
              background: open ? '#F5F3FF' : 'none',
              border: 'none',
              borderRadius: 10,
              width: 40,
              height: 40,
              cursor: 'pointer',
              color: open ? '#6D28D9' : '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bell size={18} aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 3,
                  minWidth: 16,
                  height: 16,
                  padding: '0 4px',
                  borderRadius: 999,
                  background: '#6D28D9',
                  border: '2px solid #fff',
                  color: '#fff',
                  fontSize: 9,
                  lineHeight: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <section
              id={feedId}
              className="ov-notif-panel"
              aria-label="Notificações"
              aria-live="polite"
              style={{
                position: 'absolute',
                zIndex: 20,
                top: 48,
                right: 0,
                width: 384,
                maxWidth: 'calc(100vw - 24px)',
                maxHeight: 'calc(100vh - 96px)',
                background: '#fff',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.14)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  padding: '14px 16px',
                  borderBottom: '1px solid #E2E8F0',
                  flexShrink: 0,
                }}
              >
                <strong style={{ fontSize: 14, color: '#0A0A0F' }}>Atividades</strong>
                <span style={{ fontSize: 12, color: '#64748B' }}>
                  {unreadCount
                    ? `${unreadCount} não lida${unreadCount === 1 ? '' : 's'}`
                    : 'Tudo em dia'}
                </span>
              </div>
              <div style={{ maxHeight: 420, overflowY: 'auto', minHeight: 0 }}>
                {loading && (
                  <p style={{ padding: '18px 16px', margin: 0, fontSize: 13, color: '#64748B' }}>
                    Carregando atividades…
                  </p>
                )}
                {error && (
                  <div
                    role="alert"
                    style={{ padding: '14px 16px', fontSize: 13, color: '#B91C1C' }}
                  >
                    <p style={{ margin: '0 0 8px' }}>{error}</p>
                    <button
                      type="button"
                      className="ov-btn ov-btn-outline"
                      style={{ height: 32, fontSize: 12 }}
                      onClick={() => void loadNotifications()}
                    >
                      Tentar novamente
                    </button>
                  </div>
                )}
                {!loading && !error && notifications.length === 0 && (
                  <p style={{ padding: '18px 16px', margin: 0, fontSize: 13, color: '#64748B' }}>
                    Nenhuma atividade recente.
                  </p>
                )}
                {!loading &&
                  !error &&
                  notifications.map((notification) => (
                    <article
                      key={notification.id}
                      style={{
                        padding: '13px 16px',
                        borderBottom: '1px solid #F1F5F9',
                        background: notification.read_at ? '#fff' : '#FAF8FF',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                        <span
                          aria-label={notification.read_at ? 'Lida' : 'Não lida'}
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: notification.read_at ? '#CBD5E1' : '#6D28D9',
                            marginTop: 6,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p
                            style={{
                              margin: 0,
                              color: '#0A0A0F',
                              fontSize: 13,
                              lineHeight: '19px',
                              fontWeight: notification.read_at ? 400 : 600,
                            }}
                          >
                            {notification.human_text}
                          </p>
                          <time
                            dateTime={notification.created_at}
                            style={{
                              display: 'block',
                              marginTop: 4,
                              color: '#64748B',
                              fontSize: 11,
                            }}
                          >
                            {notificationTime(notification.created_at)}
                          </time>
                          {!notification.read_at && (
                            <button
                              type="button"
                              onClick={() => void markRead(notification.id)}
                              style={{
                                display: 'inline-flex',
                                gap: 4,
                                alignItems: 'center',
                                marginTop: 8,
                                padding: 0,
                                border: 0,
                                background: 'transparent',
                                color: '#5B21B6',
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              <Check size={13} aria-hidden="true" /> Marcar como lida
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
            </section>
          )}
        </div>

        <div ref={menu} style={{ position: 'relative' }}>
          <button
            type="button"
            aria-label="Menu da conta"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 8px',
              height: 40,
              borderRadius: 10,
              border: '1px solid #E2E8F0',
              background: menuOpen ? '#F5F3FF' : '#fff',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6D28D9, #8B5CF6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {(companyName ?? 'O').charAt(0).toUpperCase()}
            </div>
            <span
              className="ov-topbar-company"
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#0A0A0F',
                maxWidth: 120,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {companyName ?? ''}
            </span>
            <ChevronDown size={14} style={{ color: '#94A3B8', flexShrink: 0 }} />
          </button>
          {menuOpen && (
            <div
              role="menu"
              style={{
                position: 'absolute',
                right: 0,
                top: 48,
                zIndex: 20,
                minWidth: 220,
                background: '#fff',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.14)',
                padding: 6,
              }}
            >
              {companyName && (
                <div
                  style={{ padding: '8px 10px', fontSize: 13, fontWeight: 600, color: '#0A0A0F' }}
                >
                  {companyName}
                </div>
              )}
              {[
                { label: 'Configurações', href: '/configuracoes', icon: Settings },
                { label: 'Plano e assinatura', href: '/plano', icon: CreditCard },
              ].map(({ label, href, icon: Icon }) => (
                <button
                  key={href}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push(href);
                  }}
                  style={menuItem}
                >
                  <Icon size={16} aria-hidden="true" /> {label}
                </button>
              ))}
              <div className="ov-show-mobile">
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={easyOn}
                  onClick={() => {
                    setEasy(!easyOn);
                    setMenuOpen(false);
                  }}
                  style={menuItem}
                >
                  <Smile size={16} aria-hidden="true" /> Modo fácil
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 12,
                      fontWeight: 600,
                      color: easyOn ? '#6D28D9' : '#64748B',
                    }}
                  >
                    {easyOn ? 'Ligado' : 'Desligado'}
                  </span>
                </button>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => void handleLogout()}
                style={{ ...menuItem, color: '#DC2626' }}
              >
                <LogOut size={16} aria-hidden="true" /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
