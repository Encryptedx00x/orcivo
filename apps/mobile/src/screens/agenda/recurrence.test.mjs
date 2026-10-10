import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const fullList = readFileSync(new URL('./AgendaScreen.tsx', import.meta.url), 'utf8');
const fullCreate = readFileSync(new URL('./AgendaCreateScreen.tsx', import.meta.url), 'utf8');
const easy = readFileSync(new URL('../../easy/screens/Agenda.tsx', import.meta.url), 'utf8');
const service = readFileSync(
  new URL('../../services/appointment.service.ts', import.meta.url),
  'utf8',
);

test('agenda completa e fácil expõem calendário mensal e lista do dia', () => {
  for (const [name, source] of [
    ['completa', fullList],
    ['fácil', easy],
  ]) {
    assert.match(source, /month|monthDays/i, `${name}: calendário mensal ausente`);
    assert.match(
      source,
      /calendarDot|appointmentDays/,
      `${name}: marcação de compromissos ausente`,
    );
    assert.match(source, /Próximo mês/, `${name}: navegação mensal ausente`);
  }
});

test('quatro opções de período, lembretes, status e recorrência usam o contrato compartilhado', () => {
  for (const [name, source] of [
    ['completa', fullCreate],
    ['fácil', easy],
  ]) {
    assert.match(source, /AppointmentPeriod/, `${name}: períodos compartilhados ausentes`);
    for (const value of ['MORNING', 'AFTERNOON', 'EVENING', 'BUSINESS_HOURS']) {
      assert.ok(source.includes(value), `${name}: período ${value} ausente`);
    }
    for (const value of ['UNCONFIRMED', 'SCHEDULED', 'COMPLETED']) {
      assert.ok(source.includes(value), `${name}: status ${value} ausente`);
    }
    for (const value of ['WEEKLY', 'MONTHLY', 'CUSTOM_MONTHS']) {
      assert.ok(source.includes(value), `${name}: recorrência ${value} ausente`);
    }
    for (const value of ['5', '15', '30', '60', '1440']) {
      assert.ok(source.includes(value), `${name}: lembrete ${value} ausente`);
    }
  }
  assert.match(service, /AppointmentCreateDto/, 'serviço não usa o DTO compartilhado');
});
