import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const full = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
const easy = readFileSync(new URL('../../facil/screens/Agenda.tsx', import.meta.url), 'utf8');

test('agenda web completa e fácil oferecem calendário mensal e lista do dia', () => {
  for (const [name, source] of [
    ['completa', full],
    ['fácil', easy],
  ]) {
    assert.match(source, /month|monthDays/i, `${name}: calendário mensal ausente`);
    assert.match(source, /appointmentDays|const count =/, `${name}: marcação ausente`);
    assert.match(source, /Próxim[oa] (mês|semana)/, `${name}: navegação do calendário ausente`);
  }
});

test('agenda web valida cliente e decimal antes de criar recorrência', () => {
  assert.match(full, /Escolha um cliente para a manutenção recorrente/);
  assert.match(full, /Informe um valor válido para a cobrança recorrente/);
  assert.doesNotMatch(full, /Number\(f\.recurrence_amount\)/);
  assert.match(easy, /AppointmentCreateDto/);
  assert.match(easy, /CUSTOM_MONTHS/);
});
