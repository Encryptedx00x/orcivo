import { AccountUpdateSchema } from './account-update.schema';

describe('AccountUpdateSchema', () => {
  it.each([
    [{ email: 'novo@exemplo.com' }, false],
    [{ new_password: 'SenhaNova456' }, false],
    [{ email: 'novo@exemplo.com', current_password: 'SenhaAtual123' }, true],
    [{ new_password: 'SenhaNova456', current_password: 'SenhaAtual123' }, true],
  ])('requires the current password for credential changes', (input, expected) => {
    expect(AccountUpdateSchema.safeParse(input).success).toBe(expected);
  });

  it('allows a display-name-only change without the current password', () => {
    expect(AccountUpdateSchema.safeParse({ name: 'Novo nome' }).success).toBe(true);
  });
});
