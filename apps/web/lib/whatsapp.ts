/**
 * Utilitários para compartilhamento via WhatsApp.
 * Usa window.open() — apenas no browser (Client Components).
 */

/** Constrói link wa.me com número normalizado e mensagem codificada. */
export function buildWhatsAppLink(
  phone: string,
  approvalUrl: string,
  quoteName: string,
): string {
  const normalized = phone.replace(/\D/g, '');
  const message = encodeURIComponent(
    `Olá! Segue o orçamento "${quoteName}" para sua aprovação:\n${approvalUrl}`,
  );
  return `https://wa.me/55${normalized}?text=${message}`;
}

/** Abre link WhatsApp em nova aba (browser only). */
export function openWhatsApp(
  phone: string,
  approvalUrl: string,
  quoteName: string,
): void {
  window.open(buildWhatsAppLink(phone, approvalUrl, quoteName), '_blank', 'noopener,noreferrer');
}
