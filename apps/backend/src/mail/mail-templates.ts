import type { MailMessage } from './mail.service';

type Template = Omit<MailMessage, 'to'>;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(title: string, bodyHtml: string): string {
  return [
    '<!DOCTYPE html>',
    '<html lang="pt-BR">',
    '<body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:24px;">',
    `<tr><td><h1 style="font-size:20px;margin:0 0 16px;">${escapeHtml(title)}</h1>${bodyHtml}`,
    '<p style="font-size:12px;color:#71717a;margin:24px 0 0;">Orcivo — gestão para o seu negócio.</p>',
    '</td></tr></table>',
    '</body>',
    '</html>',
  ].join('\n');
}

function button(url: string, label: string): string {
  return `<p><a href="${escapeHtml(url)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;">${escapeHtml(label)}</a></p><p style="font-size:12px;color:#71717a;">Se o botão não funcionar, copie e cole este link no navegador:<br>${escapeHtml(url)}</p>`;
}

export function passwordResetTemplate(params: {
  resetUrl: string;
  expiresInMinutes?: number;
}): Template {
  const minutes = params.expiresInMinutes ?? 15;
  return {
    subject: 'Redefinir senha — Orcivo',
    html: layout(
      'Redefinição de senha',
      `<p>Recebemos um pedido para redefinir a senha da sua conta. O link é válido por ${minutes} minutos.</p>${button(params.resetUrl, 'Redefinir senha')}<p>Se você não fez esse pedido, ignore este e-mail: sua senha continua a mesma.</p>`,
    ),
  };
}

export function teamInviteTemplate(params: { companyName: string; inviteUrl: string }): Template {
  const company = escapeHtml(params.companyName);
  return {
    subject: `Convite para ${params.companyName} no Orcivo`,
    html: layout(
      'Você foi convidado',
      `<p>Você foi convidado para fazer parte da equipe <strong>${company}</strong> no Orcivo.</p>${button(params.inviteUrl, 'Aceitar convite')}<p>Se você não esperava este convite, pode ignorar este e-mail.</p>`,
    ),
  };
}

export type SubscriptionMailEvent = 'CHARGE' | 'PAYMENT_FAILED' | 'BLOCKED' | 'RENEWED';

export interface SubscriptionTemplateParams {
  event: SubscriptionMailEvent;
  companyName: string;
  planName: string;
  /** Valor em reais (ex.: 99.9). */
  amount?: number;
  /** Vencimento / fim do período renovado. */
  date?: Date;
  /** Link para gerenciar a assinatura. */
  manageUrl: string;
}

function formatBrl(value: number): string {
  const [int, dec] = value.toFixed(2).split('.');
  return `R$ ${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`;
}

function formatDate(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getUTCFullYear()}`;
}

export function subscriptionTemplate(params: SubscriptionTemplateParams): Template {
  const plan = escapeHtml(params.planName);
  const company = escapeHtml(params.companyName);
  const amount =
    params.amount !== undefined ? ` no valor de <strong>${formatBrl(params.amount)}</strong>` : '';
  const date = params.date ? formatDate(params.date) : undefined;
  const manage = button(params.manageUrl, 'Gerenciar assinatura');

  switch (params.event) {
    case 'CHARGE':
      return {
        subject: 'Nova cobrança da sua assinatura — Orcivo',
        html: layout(
          'Nova cobrança',
          `<p>Geramos uma cobrança do plano <strong>${plan}</strong> da empresa <strong>${company}</strong>${amount}${date ? `, com vencimento em <strong>${date}</strong>` : ''}.</p>${manage}`,
        ),
      };
    case 'PAYMENT_FAILED':
      return {
        subject: 'Não conseguimos processar seu pagamento — Orcivo',
        html: layout(
          'Pagamento não processado',
          `<p>Não conseguimos processar o pagamento do plano <strong>${plan}</strong> da empresa <strong>${company}</strong>${amount}. Atualize a forma de pagamento para evitar o bloqueio da conta.</p>${manage}`,
        ),
      };
    case 'BLOCKED':
      return {
        subject: 'Sua conta foi bloqueada por falta de pagamento — Orcivo',
        html: layout(
          'Conta bloqueada',
          `<p>O acesso da empresa <strong>${company}</strong> ao plano <strong>${plan}</strong> foi bloqueado por falta de pagamento. Seus dados continuam guardados; regularize a assinatura para voltar a usar o Orcivo.</p>${manage}`,
        ),
      };
    case 'RENEWED':
      return {
        subject: 'Assinatura renovada — Orcivo',
        html: layout(
          'Assinatura renovada',
          `<p>Recebemos o pagamento${amount} e a assinatura do plano <strong>${plan}</strong> da empresa <strong>${company}</strong> foi renovada${date ? ` até <strong>${date}</strong>` : ''}. Obrigado!</p>${manage}`,
        ),
      };
  }
}
