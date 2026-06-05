'use client';
import { useEffect, useState } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';

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
      fetch('/api/company/members').then(r => r.json()).catch(() => []),
      fetch('/api/invites').then(r => r.json()).catch(() => []),
    ]);
    setMembers(Array.isArray(membersRes) ? membersRes : []);
    setInvites(Array.isArray(invitesRes) ? invitesRes : []);
  }

  useEffect(() => { loadData(); }, []);

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
        throw new Error(data.message ?? 'Erro ao enviar convite.');
      }
      setShowModal(false);
      setInviteEmail('');
      await loadData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(id: string) {
    await fetch(`/api/invites/${id}`, { method: 'DELETE' });
    await loadData();
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Equipe</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
        >
          <UserPlus size={16} />
          Convidar
        </button>
      </div>

      {/* Membros */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Membros ({members.length})</h2>
        </div>
        {members.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500 text-center">Nenhum membro encontrado.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {members.map(m => (
              <li key={m.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{m.user.name}</p>
                  <p className="text-sm text-gray-500">{m.user.email}</p>
                </div>
                <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{m.role}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Convites pendentes */}
      {invites.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Convites pendentes ({invites.length})</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {invites.map(inv => (
              <li key={inv.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{inv.email}</p>
                  <p className="text-xs text-gray-500">Expira {new Date(inv.expires_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <button onClick={() => handleRevoke(inv.id)} className="text-red-500 hover:text-red-700 p-1">
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modal convidar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Convidar membro</h2>
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as 'TECNICO' | 'ADMIN')}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  <option value="TECNICO">Técnico</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 py-3 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-50">
                  {loading ? 'Enviando...' : 'Enviar convite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
