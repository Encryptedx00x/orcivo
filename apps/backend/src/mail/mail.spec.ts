import { ConfigService } from '@nestjs/config';
import { ConsoleMailService } from './console-mail.service';
import { createMailService } from './mail.module';
import { passwordResetTemplate, subscriptionTemplate, teamInviteTemplate } from './mail-templates';
import { ResendMailService } from './resend-mail.service';

// Stub that ignores process.env (e.g. MAIL_PROVIDER injected by .env.test).
const cfg = (values: Record<string, string>) =>
  ({
    get: (key: string, fallback?: string) => values[key] ?? fallback,
    getOrThrow: (key: string) => values[key],
  }) as unknown as ConfigService;

describe('createMailService', () => {
  it('usa console por padrão', () => {
    expect(createMailService(cfg({}))).toBeInstanceOf(ConsoleMailService);
  });

  it('usa console com MAIL_PROVIDER=console mesmo com key', () => {
    expect(
      createMailService(cfg({ MAIL_PROVIDER: 'console', RESEND_API_KEY: 're_real' })),
    ).toBeInstanceOf(ConsoleMailService);
  });

  it('usa resend só com a env var MAIL_PROVIDER=resend + key', () => {
    expect(
      createMailService(cfg({ MAIL_PROVIDER: 'resend', RESEND_API_KEY: 're_real_key' })),
    ).toBeInstanceOf(ResendMailService);
  });

  it('faz fallback para console sem key (não quebra)', () => {
    expect(createMailService(cfg({ MAIL_PROVIDER: 'resend' }))).toBeInstanceOf(
      ConsoleMailService,
    );
    expect(
      createMailService(cfg({ MAIL_PROVIDER: 'resend', RESEND_API_KEY: '  ' })),
    ).toBeInstanceOf(ConsoleMailService);
    expect(
      createMailService(cfg({ MAIL_PROVIDER: 'resend', RESEND_API_KEY: 're_xxx' })),
    ).toBeInstanceOf(ConsoleMailService);
  });
});

describe('templates pt-BR', () => {
  it('reset de senha', () => {
    expect(
      passwordResetTemplate({ resetUrl: 'https://app.orcivo.com.br/reset-password?token=abc' }),
    ).toMatchSnapshot();
  });

  it('convite de equipe', () => {
    expect(
      teamInviteTemplate({
        companyName: 'Oficina do Zé',
        inviteUrl: 'https://app.orcivo.com.br/convite/tok',
      }),
    ).toMatchSnapshot();
  });

  it.each(['CHARGE', 'PAYMENT_FAILED', 'BLOCKED', 'RENEWED'] as const)('assinatura %s', (event) => {
    expect(
      subscriptionTemplate({
        event,
        companyName: 'Oficina do Zé',
        planName: 'Pro',
        amount: 1299.9,
        date: new Date('2026-11-10T12:00:00Z'),
        manageUrl: 'https://app.orcivo.com.br/assinatura',
      }),
    ).toMatchSnapshot();
  });

  it('escapa HTML em dados dinâmicos', () => {
    const { html } = teamInviteTemplate({
      companyName: '<script>alert(1)</script>',
      inviteUrl: 'https://x.test/?a=1&b="2"',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('a=1&amp;b=&quot;2&quot;');
  });
});
