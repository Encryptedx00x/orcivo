'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];

function getWeekDays(base: Date): Date[] {
  const day = base.getDay();
  const monday = new Date(base);
  monday.setDate(base.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const DAY_SHORT = ['seg','ter','qua','qui','sex','sáb','dom'];

// Static events: { weekDay 0-6, hourIdx (0=08:00), title, tag, color }
const EVENTS = [
  { d: 0, h: 1, title: 'Visita CFTV', tag: 'OS #312',   color: '#6D28D9', span: 1 },
  { d: 0, h: 6, title: 'Orç. presencial', tag: 'ORÇ #248', color: '#D97706', span: 1 },
  { d: 2, h: 2, title: 'Instalação portão', tag: 'OS #318', color: '#6D28D9', span: 2 },
  { d: 3, h: 4, title: 'Reunião equipe', tag: 'Interno', color: '#64748B', span: 1 },
  { d: 4, h: 1, title: 'Manutenção preventiva', tag: 'OS #305', color: '#16A34A', span: 2 },
];

export default function AgendaPage(): JSX.Element {
  const [base, setBase] = useState(new Date());
  const days = getWeekDays(base);

  const prevWeek = () => { const d = new Date(base); d.setDate(d.getDate() - 7); setBase(d); };
  const nextWeek = () => { const d = new Date(base); d.setDate(d.getDate() + 7); setBase(d); };

  const weekLabel = `${days[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${days[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  return (
    <div>
      <div className="ov-page-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.015em', color: '#0A0A0F', margin: 0 }}>Agenda</h1>
          <div style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>{weekLabel}</div>
        </div>
        <div className="row-flex">
          <button className="ov-btn ov-btn-outline" onClick={prevWeek}><ChevronLeft size={16} /></button>
          <button className="ov-btn ov-btn-outline" onClick={() => setBase(new Date())}>Hoje</button>
          <button className="ov-btn ov-btn-outline" onClick={nextWeek}><ChevronRight size={16} /></button>
          <button className="ov-btn ov-btn-primary"><Plus size={16} />Novo compromisso</button>
        </div>
      </div>

      <div className="ov-card" style={{ overflow: 'hidden' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
          <div />
          {days.map((d, i) => {
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <div key={i} style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, color: isToday ? '#6D28D9' : '#64748B', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                {DAY_SHORT[i]} {d.getDate()}
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        {HOURS.map((h, hi) => (
          <div key={hi} style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', borderBottom: '1px solid #F1F5F9', minHeight: 48 }}>
            <div style={{ padding: '6px 8px', fontSize: 11, color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>{h}</div>
            {days.map((_, di) => {
              const evt = EVENTS.find(e => e.d === di && e.h === hi);
              return (
                <div key={di} style={{ borderLeft: '1px solid #F1F5F9', padding: 4, position: 'relative' }}>
                  {evt && (
                    <div style={{
                      padding: '6px 8px', borderRadius: 8,
                      background: '#F5F3FF',
                      borderLeft: `3px solid ${evt.color}`,
                      height: 48 * evt.span - 8,
                      overflow: 'hidden',
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{evt.title}</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>{evt.tag}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

    </div>
  );
}
