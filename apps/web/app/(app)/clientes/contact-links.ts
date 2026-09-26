/**
 * Local Brazilian numbers include DDD; explicit international numbers keep
 * their country code. Unusable inputs (no DDD, incomplete, non-numeric) hide
 * the contact actions instead of producing broken links.
 */
export function contactLinks(phone?: string | null): { tel: string; whatsapp: string } | null {
  const raw = phone?.trim();
  if (!raw || !/^[+\d\s().-]+$/.test(raw)) return null;
  let digits = raw.replace(/\D/g, '');
  const international = raw.startsWith('+') || raw.startsWith('00');
  if (raw.startsWith('00')) digits = digits.slice(2);
  if (!international) {
    if (digits.length === 10 || digits.length === 11) {
      digits = `55${digits}`;
    } else if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
      // já digitado com o DDI 55 — manter como está
    } else {
      return null;
    }
  }
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return { tel: `tel:+${digits}`, whatsapp: `https://wa.me/${digits}` };
}
