'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';

import { updateAppointment, deleteAppointment } from './actions';

const HOURS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
];
const DAY_SHORT = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
const TYPE_COLOR: Record<string, string> = {
  VISITA: '#6D28D9',
  INSTALACAO: '#6D28D9',
  ORCAMENTO: '#D97706',
  MANUTENCAO: '#16A34A',
  REUNIAO: '#64748B',
  OUTRO: '#64748B',
};

function getWeekDays(base: Date): Date[] {
  const day = base.getDay();
  const monday = new Date(base);
  monday.setDate(base.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

interface Appt {
  id: string;
  title: string;
  type: string;
  starts_at: string;
  ends_at: string | null;
  notes: string | null;
  customer_id: string | null;
  customer: { id: string; name: string } | null;
}
interface CustomerOpt {
  id: string;
  name: string;
}

export default function AgendaPage(): JSX.Element {
  const [base, setBase] = useState(new Date());
  const [appts, setAppts] = useState<Appt[]>([]);
  const [customers, setCustomers] = useState<CustomerOpt[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Appt | null>(null);
  const [loadError, setLoadError] = useState('');
  const days = getWeekDays(base);
  // Phones get a single-day grid with a day picker; desktop keeps the full week.
  const [isMobile, setIsMobile] = useState(false);
  const [dayIdx, setDayIdx] = useState(() => (new Date().getDay() + 6) % 7);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  const visibleDays = isMobile ? [dayIdx] : days.map((_, i) => i);
  const gridColumns = isMobile ? '52px minmax(0, 1fr)' : '60px repeat(7, minmax(0, 1fr))';

  const load = useCallback(async () => {
    const days = getWeekDays(base);
    const from = days[0].toISOString();
    const to = new Date(days[6].getTime() + 86_400_000).toISOString();
    try {
      const res = await fetch(
        `/api/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      if (!res.ok) throw new Error('Não foi possível carregar a agenda.');
      const d = await res.json();
      setLoadError('');
      setAppts(Array.isArray(d.data) ? d.data : []);
    } catch {
      setLoadError('Não foi possível carregar a agenda. Tente novamente.');
    }
  }, [base]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    fetch('/api/customers?limit=200')
      .then((r) => r.json())
      .then((d) => setCustomers(d.data ?? []))
      .catch(() => {});
  }, []);

  const prevWeek = () => {
    const d = new Date(base);
    d.setDate(d.getDate() - 7);
    setBase(d);
  };
  const nextWeek = () => {
    const d = new Date(base);
    d.setDate(d.getDate() + 7);
    setBase(d);
  };
  const weekLabel = `${days[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${days[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  function eventsFor(dayIdx: number, hour: number): Appt[] {
    const dayStart = days[dayIdx];
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);
    return appts.filter((a) => {
      const s = new Date(a.starts_at);
      return s >= dayStart && s < dayEnd && s.getHours() === hour;
    });
  }
  const hours = [
    ...new Set([
      ...HOURS,
      ...appts.map((a) => `${String(new Date(a.starts_at).getHours()).padStart(2, '0')}:00`),
    ]),
  ].sort();

  return (
    <div>
      <div className="ov-page-header" style={{ flexWrap: 'wrap' }}>
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '-0.015em',
              color: '#0A0A0F',
              margin: 0,
            }}
          >
            Agenda
          </h1>
          <div style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>{weekLabel}</div>
        </div>
        <div className="row-flex" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button aria-label="Semana anterior" className="ov-btn ov-btn-outline" onClick={prevWeek}>
            <ChevronLeft size={16} />
          </button>
          <button className="ov-btn ov-btn-outline" onClick={() => setBase(new Date())}>
            Hoje
          </button>
          <button aria-label="Próxima semana" className="ov-btn ov-btn-outline" onClick={nextWeek}>
            <ChevronRight size={16} />
          </button>
          <button
            className="ov-btn ov-btn-primary"
            onClick={() => {
              setSelected(null);
              setShowModal(true);
            }}
          >
            <Plus size={16} />
            Novo compromisso
          </button>
        </div>
      </div>

      {loadError && (
        <p role="alert">
          {loadError}{' '}
          <button className="ov-btn ov-btn-outline" onClick={() => void load()}>
            Tentar novamente
          </button>
        </p>
      )}
      {isMobile && (
        <div
          role="tablist"
          aria-label="Dia da semana"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 4,
            marginBottom: 12,
          }}
        >
          {days.map((d, i) => {
            const active = i === dayIdx;
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setDayIdx(i)}
                style={{
                  minHeight: 52,
                  border: `1px solid ${active ? '#6D28D9' : '#E2E8F0'}`,
                  borderRadius: 10,
                  background: active ? '#6D28D9' : '#fff',
                  color: active ? '#fff' : isToday ? '#6D28D9' : '#0A0A0F',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <div style={{ textTransform: 'uppercase', opacity: 0.8 }}>{DAY_SHORT[i]}</div>
                <div style={{ fontSize: 16 }}>{d.getDate()}</div>
              </button>
            );
          })}
        </div>
      )}
      <div className="ov-card" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
        <div style={{ minWidth: isMobile ? 0 : 720 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: gridColumns,
              borderBottom: '1px solid #E2E8F0',
              background: '#F8FAFC',
            }}
          >
            <div />
            {visibleDays.map((i) => {
              const d = days[i];
              const isToday = d.toDateString() === new Date().toDateString();
              return (
                <div
                  key={i}
                  style={{
                    padding: '10px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: isToday ? '#6D28D9' : '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '.04em',
                    minWidth: 0,
                  }}
                >
                  {DAY_SHORT[i]} {d.getDate()}
                </div>
              );
            })}
          </div>
          {hours.map((h, hi) => (
            <div
              key={hi}
              style={{
                display: 'grid',
                gridTemplateColumns: gridColumns,
                borderBottom: '1px solid #F1F5F9',
                minHeight: 48,
              }}
            >
              <div
                style={{
                  padding: '6px 8px',
                  fontSize: 11,
                  color: '#94A3B8',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {h}
              </div>
              {visibleDays.map((di) => {
                const events = eventsFor(di, Number(h.slice(0, 2)));
                return (
                  <div
                    key={di}
                    style={{
                      borderLeft: '1px solid #F1F5F9',
                      padding: 4,
                      position: 'relative',
                      minWidth: 0,
                    }}
                  >
                    {events.map((evt) => (
                      <button
                        key={evt.id}
                        type="button"
                        aria-label={`Editar compromisso ${evt.title}`}
                        onClick={() => {
                          setSelected(evt);
                          setShowModal(true);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          cursor: 'pointer',
                          border: 0,
                          marginBottom: 4,
                          padding: '6px 8px',
                          borderRadius: 8,
                          background: '#F5F3FF',
                          borderLeft: `3px solid ${TYPE_COLOR[evt.type] ?? '#6D28D9'}`,
                          minHeight: 40,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#0A0A0F',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {evt.title}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>
                          {evt.customer?.name ??
                            evt.type.charAt(0) + evt.type.slice(1).toLowerCase()}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <AppointmentModal
          appointment={selected}
          customers={customers}
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

function localDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
function localTime(value: Date): string {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

function AppointmentModal({
  appointment,
  customers,
  onClose,
  onCreated,
}: {
  appointment: Appt | null;
  customers: CustomerOpt[];
  onClose: () => void;
  onCreated: () => void;
}): JSX.Element {
  const start = appointment ? new Date(appointment.starts_at) : new Date();
  const end = appointment?.ends_at ? new Date(appointment.ends_at) : null;
  const [f, setF] = useState({
    title: appointment?.title ?? '',
    type: appointment?.type ?? 'VISITA',
    customer_id: appointment?.customer_id ?? appointment?.customer?.id ?? '',
    date: localDate(start),
    start: appointment ? localTime(start) : '09:00',
    endDate: localDate(end ?? start),
    end: end ? localTime(end) : '',
    notes: appointment?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    setError('');
    if (!f.title.trim()) {
      setError('Informe um título.');
      return;
    }
    const startsAt = new Date(`${f.date}T${f.start}:00`);
    const endsAt = f.end ? new Date(`${f.endDate}T${f.end}:00`) : null;
    if (
      !Number.isFinite(startsAt.getTime()) ||
      (endsAt && (!Number.isFinite(endsAt.getTime()) || endsAt < startsAt))
    ) {
      setError('Informe datas válidas, com fim maior ou igual ao início.');
      return;
    }
    busy.current = true;
    setSaving(true);
    try {
      const body = {
        title: f.title.trim(),
        type: f.type,
        customer_id: f.customer_id || (appointment ? null : undefined),
        notes: f.notes || (appointment ? null : undefined),
        starts_at: startsAt.toISOString(),
        ends_at: endsAt?.toISOString() ?? (appointment ? null : undefined),
      };
      if (appointment) {
        const result = await updateAppointment(appointment.id, body);
        if (!result.ok) throw new Error(result.message);
      } else {
        const res = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok)
          throw new Error(
            'Não foi possível criar o compromisso. Confira os campos e tente novamente.',
          );
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  async function remove() {
    if (!appointment || busy.current) return;
    busy.current = true;
    setSaving(true);
    setError('');
    try {
      const result = await deleteAppointment(appointment.id);
      if (!result.ok) throw new Error(result.message);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível excluir.');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="appointment-heading"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy.current) onClose();
      }}
      style={{
        border: 0,
        borderRadius: 16,
        padding: 28,
        width: 'calc(100% - 32px)',
        maxWidth: 460,
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,.18)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 18,
        }}
      >
        <h2
          id="appointment-heading"
          style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0F', margin: 0 }}
        >
          {confirmDelete
            ? 'Excluir compromisso?'
            : appointment
              ? 'Editar compromisso'
              : 'Novo compromisso'}
        </h2>
        <button
          type="button"
          aria-label="Fechar"
          disabled={saving}
          onClick={onClose}
          className="ov-btn ov-btn-outline"
        >
          <X size={18} />
        </button>
      </div>
      {error && (
        <p role="alert" style={{ color: '#DC2626' }}>
          {error}
        </p>
      )}
      {confirmDelete ? (
        <div>
          <p>Excluir “{appointment?.title}”? Esta ação não pode ser desfeita.</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button
              type="button"
              disabled={saving}
              className="ov-btn ov-btn-outline"
              onClick={() => {
                setConfirmDelete(false);
                setError('');
              }}
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={saving}
              className="ov-btn ov-btn-primary"
              onClick={() => void remove()}
            >
              {saving ? 'Excluindo…' : 'Confirmar exclusão'}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit}>
          <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="appt-title" className="ov-label">
                Título *
              </label>
              <input
                id="appt-title"
                autoFocus
                className="ov-input"
                value={f.title}
                maxLength={160}
                onChange={(e) => setF((p) => ({ ...p, title: e.target.value }))}
                required
              />
            </div>
            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}
            >
              <div>
                <label htmlFor="appt-type" className="ov-label">
                  Tipo
                </label>
                <select
                  id="appt-type"
                  className="ov-input"
                  value={f.type}
                  onChange={(e) => setF((p) => ({ ...p, type: e.target.value }))}
                >
                  <option value="VISITA">Visita</option>
                  <option value="INSTALACAO">Instalação</option>
                  <option value="ORCAMENTO">Orçamento</option>
                  <option value="MANUTENCAO">Manutenção</option>
                  <option value="REUNIAO">Reunião</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>
              <div>
                <label htmlFor="appt-customer" className="ov-label">
                  Cliente
                </label>
                <select
                  id="appt-customer"
                  className="ov-input"
                  value={f.customer_id}
                  onChange={(e) => setF((p) => ({ ...p, customer_id: e.target.value }))}
                >
                  <option value="">Sem cliente</option>
                  {f.customer_id && !customers.some((c) => c.id === f.customer_id) && (
                    <option value={f.customer_id}>
                      {appointment?.customer?.name ?? 'Cliente atual'}
                    </option>
                  )}
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}
            >
              <div>
                <label htmlFor="appt-date" className="ov-label">
                  Data de início
                </label>
                <input
                  id="appt-date"
                  className="ov-input"
                  type="date"
                  value={f.date}
                  onChange={(e) =>
                    setF((p) => ({
                      ...p,
                      date: e.target.value,
                      endDate: p.endDate === p.date ? e.target.value : p.endDate,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label htmlFor="appt-start" className="ov-label">
                  Início
                </label>
                <input
                  id="appt-start"
                  className="ov-input"
                  type="time"
                  value={f.start}
                  onChange={(e) => setF((p) => ({ ...p, start: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label htmlFor="appt-end-date" className="ov-label">
                  Data de fim
                </label>
                <input
                  id="appt-end-date"
                  className="ov-input"
                  type="date"
                  value={f.endDate}
                  onChange={(e) => setF((p) => ({ ...p, endDate: e.target.value }))}
                  required={Boolean(f.end)}
                />
              </div>
              <div>
                <label htmlFor="appt-end" className="ov-label">
                  Fim (opcional)
                </label>
                <input
                  id="appt-end"
                  className="ov-input"
                  type="time"
                  value={f.end}
                  onChange={(e) => setF((p) => ({ ...p, end: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="appt-notes" className="ov-label">
                Observações
              </label>
              <textarea
                id="appt-notes"
                className="ov-input"
                maxLength={500}
                value={f.notes}
                onChange={(e) => setF((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {appointment && (
                <button
                  type="button"
                  className="ov-btn ov-btn-outline"
                  onClick={() => {
                    setConfirmDelete(true);
                    setError('');
                  }}
                >
                  Excluir
                </button>
              )}
              <button type="button" onClick={onClose} className="ov-btn ov-btn-outline">
                Cancelar
              </button>
              <button type="submit" className="ov-btn ov-btn-primary">
                {saving ? 'Salvando…' : appointment ? 'Salvar alterações' : 'Criar'}
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </dialog>
  );
}
