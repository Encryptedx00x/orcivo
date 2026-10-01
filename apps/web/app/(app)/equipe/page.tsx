'use client';
import { useEffect, useState } from 'react';
import { UserPlus, Trash2, Users, Check, Minus } from 'lucide-react';

// ── Token aliases ─────────────────────────────────────────────────────
const T = {
  ink: '#0A0A0F',
  fg2: '#334155',
  fg3: '#64748B',
  border1: '#E2E8F0',
  border2: '#F1F5F9',
  purple600: '#6D28D9',
  purple50: '#F5F3FF',
  purple800: '#4C1D95',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  successBg: '#DCFCE7',
  success: '#16A34A',
};

interface Member {
  id: string;
  user: { name: string; email: string };
  role: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  expires_at: string;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  TECNICO: 'Técnico',
  OWNER: 'Proprietário',
};

function RolePill({ role }: { role: string }) {
  const isAdmin = role === 'ADMIN' || role === 'OWNER';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 600,
        padding: '4px 9px',
        borderRadius: 9999,
        background: isAdmin ? T.purple50 : T.slate100,
        color: isAdmin ? T.purple800 : T.fg2,
      }}
    >
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}

export default function EquipePage(): JSX.Element {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'TECNICO' | 'ADMIN'>('TECNICO');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    const [membersRes, invitesRes] = await Promise.all([
      fetch('/api/company/members')
        .then((r) => r.json())
        .catch(() => []),
      fetch('/api/invites')
        .then((r) => r.json())
        .catch(() => []),
    ]);
    setMembers(Array.isArray(membersRes) ? membersRes : []);
    setInvites(Array.isArray(invitesRes) ? invitesRes : []);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? 'Erro ao enviar convite.');
      }
      setShowModal(false);
      setInviteEmail('');
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(id: string) {
    await fetch(`/api/invites/${id}`, { method: 'DELETE' });
    await loadData();
  }

  return (
    <div className="ov-page" style={{ maxWidth: 900 }}>
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="ov-page-header">
        <div>
          <h1
            style={{
              fontSize: 24,
              lineHeight: '32px',
              fontWeight: 700,
              letterSpacing: '-0.015em',
              color: T.ink,
              margin: 0,
            }}
          >
            Equipe
          </h1>
          <div style={{ color: T.fg3, fontSize: 14, marginTop: 4 }}>
            {members.length} membro{members.length !== 1 ? 's' : ''} · {invites.length} convite
            {invites.length !== 1 ? 's' : ''} pendente{invites.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button
          className="ov-btn ov-btn-primary"
          style={{ gap: 8 }}
          onClick={() => setShowModal(true)}
        >
          <UserPlus size={16} />
          Convidar membro
        </button>
      </div>

      {/* ── Members ─────────────────────────────────────────────────── */}
      <div className="ov-card" style={{ overflow: 'hidden', marginBottom: 16 }}>
        <div
          style={{
            padding: '14px 18px',
            borderBottom: `1px solid ${T.border2}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.ink }}>
            Membros ativos{' '}
            <span style={{ fontSize: 13, fontWeight: 400, color: T.fg3 }}>({members.length})</span>
          </h3>
        </div>

        {members.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Users
              size={40}
              style={{ margin: '0 auto 12px', color: '#CBD5E1', display: 'block' }}
            />
            <p style={{ fontWeight: 600, fontSize: 15, color: T.ink, margin: '0 0 6px' }}>
              Nenhum membro ainda.
            </p>
            <p style={{ fontSize: 14, color: T.fg3, margin: 0 }}>
              Convide técnicos e admins para colaborar na plataforma.
            </p>
          </div>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              background: '#fff',
            }}
          >
            <thead>
              <tr>
                {['Nome', 'Email', 'Função', ''].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '10px 18px',
                      background: T.slate50,
                      color: T.fg3,
                      fontWeight: 500,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '.04em',
                      borderBottom: `1px solid ${T.border1}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={m.id}>
                  <td
                    style={{
                      padding: '12px 18px',
                      fontWeight: 600,
                      color: T.ink,
                      fontSize: 14,
                      borderBottom: i < members.length - 1 ? `1px solid ${T.border2}` : 0,
                    }}
                  >
                    {m.user.name}
                  </td>
                  <td
                    style={{
                      padding: '12px 18px',
                      fontSize: 13,
                      color: T.fg3,
                      fontFamily: 'var(--font-mono)',
                      borderBottom: i < members.length - 1 ? `1px solid ${T.border2}` : 0,
                    }}
                  >
                    {m.user.email}
                  </td>
                  <td
                    style={{
                      padding: '12px 18px',
                      borderBottom: i < members.length - 1 ? `1px solid ${T.border2}` : 0,
                    }}
                  >
                    <RolePill role={m.role} />
                  </td>
                  <td
                    style={{
                      padding: '12px 18px',
                      textAlign: 'right',
                      borderBottom: i < members.length - 1 ? `1px solid ${T.border2}` : 0,
                    }}
                  >
                    {/* future: remove member */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pending invites ─────────────────────────────────────────── */}
      {invites.length > 0 && (
        <div className="ov-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border2}` }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.ink }}>
              Convites pendentes{' '}
              <span style={{ fontSize: 13, fontWeight: 400, color: T.fg3 }}>
                ({invites.length})
              </span>
            </h3>
          </div>
          {invites.map((inv, i) => (
            <div
              key={inv.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 18px',
                borderBottom: i < invites.length - 1 ? `1px solid ${T.border2}` : 0,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: T.ink }}>{inv.email}</div>
                <div style={{ fontSize: 12, color: T.fg3 }}>
                  Expira {new Date(inv.expires_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <RolePill role={inv.role} />
              <button
                onClick={() => {
                  void handleRevoke(inv.id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94A3B8',
                  display: 'flex',
                  padding: 4,
                }}
                title="Revogar convite"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Permissões por função (padrão · somente leitura) ────────── */}
      <h3 style={{ fontSize: 15, fontWeight: 600, color: T.ink, margin: '24px 0 2px' }}>
        Permissões — Função: Técnico
      </h3>
      <p style={{ fontSize: 13, color: T.fg3, margin: '0 0 12px' }}>
        Padrão da função, aplicado automaticamente. Permissões personalizadas chegam em breve.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {(
          [
            [
              'Clientes',
              [
                ['Ver clientes atribuídos', true],
                ['Criar e editar clientes', false],
                ['Excluir clientes', false],
              ],
            ],
            [
              'Orçamentos',
              [
                ['Criar orçamentos', true],
                ['Editar orçamentos', true],
                ['Aprovar / rejeitar', false],
              ],
            ],
            [
              'Ordens de Serviço',
              [
                ['Executar OS atribuídas', true],
                ['Atribuir técnicos', false],
                ['Cancelar OS', false],
              ],
            ],
            [
              'Financeiro',
              [
                ['Apenas leitura', true],
                ['Registrar recebimentos', false],
                ['Editar lançamentos', false],
              ],
            ],
            [
              'Catálogo',
              [
                ['Ver catálogo', true],
                ['Criar e editar itens', false],
              ],
            ],
            [
              'Administração',
              [
                ['Convidar usuários', false],
                ['Alterar plano', false],
                ['Configurações da empresa', false],
              ],
            ],
          ] as [string, [string, boolean][]][]
        ).map(([title, perms], i) => (
          <div key={i} className="ov-card ov-card-body">
            <div style={{ fontWeight: 600, fontSize: 14, color: T.ink, marginBottom: 10 }}>
              {title}
            </div>
            {perms.map(([name, on], j) => (
              <div
                key={j}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: j < perms.length - 1 ? `1px solid ${T.border2}` : 'none',
                }}
              >
                <span style={{ fontSize: 13, color: on ? T.fg2 : '#94A3B8' }}>{name}</span>
                {on ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      background: T.successBg,
                      color: T.success,
                      flexShrink: 0,
                    }}
                  >
                    <Check size={13} strokeWidth={3} />
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      background: T.slate100,
                      color: '#94A3B8',
                      flexShrink: 0,
                    }}
                  >
                    <Minus size={13} strokeWidth={3} />
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── Invite modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10,10,15,.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 28,
              width: '100%',
              maxWidth: 400,
              boxShadow: '0 8px 32px rgba(0,0,0,.18)',
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: T.ink, margin: '0 0 20px' }}>
              Convidar membro
            </h2>

            {error && (
              <div
                style={{
                  background: T.dangerBg,
                  border: `1px solid #FECACA`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  color: T.danger,
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}

            <form
              onSubmit={(e) => {
                void handleInvite(e);
              }}
            >
              <div style={{ marginBottom: 14 }}>
                <label className="ov-label">E-mail</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="ov-input"
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="ov-label">Função</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'TECNICO' | 'ADMIN')}
                  className="ov-input"
                >
                  <option value="TECNICO">Técnico</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="ov-btn ov-btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="ov-btn ov-btn-primary"
                  style={{ flex: 1 }}
                >
                  {loading ? 'Enviando…' : 'Enviar convite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
