import { AppointmentCreateSchema, AppointmentReminderMinutesSchema } from '..';

describe('appointment scheduling rules', () => {
  const base = {
    title: 'Manutenção preventiva',
    starts_at: '2026-10-10T12:00:00.000Z',
    ends_at: '2026-10-10T16:00:00.000Z',
  };

  it('accepts a period, reminder and complete recurrence contract', () => {
    expect(
      AppointmentCreateSchema.parse({
        ...base,
        schedule_period: 'MORNING',
        reminder_minutes: 30,
        recurrence_type: 'CUSTOM_MONTHS',
        recurrence_interval: 6,
        recurrence_amount: '180.00',
        customer_id: '11111111-1111-4111-8111-111111111111',
      }),
    ).toMatchObject({ recurrence_interval: 6, recurrence_amount: '180.00' });
  });

  it('requires customer, decimal amount and interval for custom recurrence', () => {
    expect(
      AppointmentCreateSchema.safeParse({ ...base, recurrence_type: 'CUSTOM_MONTHS' }).success,
    ).toBe(false);
    expect(AppointmentReminderMinutesSchema.safeParse(10).success).toBe(false);
  });
});
