'use client';
import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';

const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
const DAY_SHORT = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
const TYPE_COLOR: Record<string, string> = {
  VISITA: '#6D28D9', INSTALACAO: '#6D28D9', ORCAMENTO: '#D97706',
  MANUTENCAO: '#16A34A', REUNIAO: '#64748B', OUTRO: '#64748B',
};

function getWeekDays(base: Date): Date[] {
  const day = base.getDay();
  const monday = new Date(base);
  monday.setDate(base.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
}

interface Appt {
  id: string; title: string; type: string; starts_at: string; ends_at: string | null;
  customer: { id: string; name: string } | null;
}
interface CustomerOpt { id: string; name: string }

export default function AgendaPage(): JSX.Element {
  const [base, setBase] = useState(new Date());
  const [appts, setAppts] = useState<Appt[]>([]);
  const [customers, setCustomers] = useState<CustomerOpt[]>([]);
  const [showModal, setShowModal] = useState(false);
  const days = getWeekDays(base);

  const load = useCallback(async () => {
    const from = days[0].toISOString();
    const to = new Date(days[6].getTime() + 86_400_000).toISOString();
    try {
      const res = await fetch(`/api/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      const d = await res.json();
      setAppts(Array.isArray(d.data) ? d.data : []);
    } catch { setAppts([]); }
  }, [base]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { fetch('/api/customers?limit=200').then((r) => r.json()).then((d) => setCustomers(d.data ?? [])).catch(() => {}); }, []);

  const prevWeek = () => { const d = new Date(base); d.setDate(d.getDate() - 7); setBase(d); };
  const nextWeek = () => { const d = new Date(base); d.setDate(d.getDate() + 7); setBase(d); };
  const weekLabel = `${days[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${days[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  function eventFor(dayIdx: number, hourIdx: number): Appt | undefined {
    const dayStart = days[dayIdx];
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);
    return appts.find((a) => {
      const s = new Date(a.starts_at);
      return s >= dayStart && s < dayEnd && s.getHours() === hourIdx + 8;
    });
  }
  function spanFor(a: Appt): number {
    if (!a.ends_at) return 1;
    const h = (new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 3_600_000;
    return Math.max(1, Math.min(11, Math.round(h)));
  }

  return (
    <div>
      <div className="ov-page-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.015em', color: '#0A0A0F', margin: 0 }}>Agenda</h1>
          <div style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>{weekLabel}</div>
        </div>
        <div className="row-flex" style={{ display: 'flex', gap: 8 }}>
          <button className="ov-btn ov-btn-outline" onClick={prevWeek}><ChevronLeft size={16} /></button>
          <button className="ov-btn ov-btn-outline" onClick={() => setBase(new Date())}>Hoje</button>
          <button className="ov-btn ov-btn-outline" onClick={nextWeek}><ChevronRight size={16} /></button>
          <button className="ov-btn ov-btn-primary" style={{ gap: 8 }} onClick={() => setShowModal(true)}><Plus size={16} />Novo compromisso</button>
        </div>
      </div>

      <div className="ov-card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
          <div />
          {days.map((d, i) => {
            const isToday = d.toDateString() === new Date().toDateString();
            return <div key={i} style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, color: isToday ? '#6D28D9' : '#64748B', textTransform: 'uppercase', letterSpacing: '.04em' }}>{DAY_SHORT[i]} {d.getDate()}</div>;
          })}
        </div>
        {HOURS.map((h, hi) => (
          <div key={hi} style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', borderBottom: '1px solid #F1F5F9', minHeight: 48 }}>
            <div style={{ padding: '6px 8px', fontSize: 11, color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>{h}</div>
            {days.map((_, di) => {
              const evt = eventFor(di, hi);
              return (
                <div key={di} style={{ borderLeft: '1px solid #F1F5F9', padding: 4, position: 'relative' }}>
                  {evt && (
                    <div style={{ padding: '6px 8px', borderRadius: 8, background: '#F5F3FF', borderLeft: `3px solid ${TYPE_COLOR[evt.type] ?? '#6D28D9'}`, height: 48 * spanFor(evt) - 8, overflow: 'hidden' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{evt.title}</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>{evt.customer?.name ?? evt.type.charAt(0) + evt.type.slice(1).toLowerCase()}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {showModal && <NewAppointmentModal customers={customers} onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); void load(); }} />}
    </div>
  );
}

function NewAppointmentModal({ customers, onClose, onCreated }: { customers: CustomerOpt[]; onClose: () => void; onCreated: () => void }): JSX.Element {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ title: '', type: 'VISITA', customer_id: '', date: today, start: '09:00', end: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!f.title.trim()) { setError('Informe um título.'); return; }
    const starts_at = new Date(`${f.date}T${f.start}:00`).toISOString();
    const ends_at = f.end ? new Date(`${f.date}T${f.end}:00`).toISOString() : undefined;
    setSaving(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: f.title, type: f.type, customer_id: f.customer_id || undefined, notes: f.notes || undefined, starts_at, ends_at }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message ?? 'Erro ao criar.'); }
      onCreated();
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro inesperado.'); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,15,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 460, boxShadow: '0 8px 32px rgba(0,0,0,.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0F', margin: 0 }}>Novo compromisso</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex' }}><X size={18} /></button>
        </div>
        {error && <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#DC2626', fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <form onSubmit={submit}>
          <div style={{ marginBottom: 12 }}>
            <label className="ov-label">Título *</label>
            <input className="ov-input" value={f.title} onChange={(e) => setF((p) => ({ ...p, title: e.target.value }))} placeholder="Ex: Visita técnica CFTV" required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="ov-label">Tipo</label>
              <select className="ov-input" value={f.type} onChange={(e) => setF((p) => ({ ...p, type: e.target.value }))}>
                <option value="VISITA">Visita</option><option value="INSTALACAO">Instalação</option><option value="ORCAMENTO">Orçamento</option><option value="MANUTENCAO">Manutenção</option><option value="REUNIAO">Reunião</option><option value="OUTRO">Outro</option>
              </select>
            </div>
            <div>
              <label className="ov-label">Cliente</label>
              <select className="ov-input" value={f.customer_id} onChange={(e) => setF((p) => ({ ...p, customer_id: e.target.value }))}>
                <option value="">—</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div><label className="ov-label">Data</label><input className="ov-input" type="date" value={f.date} onChange={(e) => setF((p) => ({ ...p, date: e.target.value }))} required /></div>
            <div><label className="ov-label">Início</label><input className="ov-input" type="time" value={f.start} onChange={(e) => setF((p) => ({ ...p, start: e.target.value }))} required /></div>
            <div><label className="ov-label">Fim</label><input className="ov-input" type="time" value={f.end} onChange={(e) => setF((p) => ({ ...p, end: e.target.value }))} /></div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} className="ov-btn ov-btn-outline" style={{ flex: 1 }}>Cancelar</button>
            <button type="submit" disabled={saving} className="ov-btn ov-btn-primary" style={{ flex: 1 }}>{saving ? 'Salvando…' : 'Criar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
