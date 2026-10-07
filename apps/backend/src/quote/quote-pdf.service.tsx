import Decimal from 'decimal.js';
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Svg,
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer';
import { Injectable } from '@nestjs/common';
import {
  formatMoney,
  QUOTE_DOC_TITLES,
  QuoteStatus,
  resolveQuoteDocOptions,
} from '@orcivo/shared-types';
import { registerPdfFonts } from './pdf-fonts';

registerPdfFonts();

// ── Tokens (espelham docs/handoff/tokens.json — nunca inventar valores) ──
const C = {
  ink: '#0A0A0F',
  fg2: '#334155', // slate-700
  fg3: '#64748B', // slate-500
  fg4: '#94A3B8', // slate-400
  border1: '#E2E8F0', // slate-200
  border2: '#F1F5F9', // slate-100
  slate50: '#F8FAFC',
  purple50: '#F5F3FF',
  purple600: '#6D28D9',
  purple700: '#5B21B6',
  purple800: '#4C1D95',
  successBg: '#DCFCE7',
  successFg: '#166534',
  warningBg: '#FEF3C7',
  warningFg: '#92400E',
  dangerBg: '#FEE2E2',
  dangerFg: '#991B1B',
  infoBg: '#E0F2FE',
  infoFg: '#075985',
  slate100: '#F1F5F9',
  white: '#FFFFFF',
};
const SANS = 'Inter';
const MONO = 'JetBrainsMono';

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontFamily: SANS,
    fontSize: 10,
    fontWeight: 400,
    color: C.ink,
    lineHeight: 1.5,
  },

  // ── Cabeçalho ──
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brandRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  brandTile: { width: 38, height: 38 },
  brandLetter: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 38,
    height: 38,
    textAlign: 'center',
    color: C.white,
    fontFamily: SANS,
    fontWeight: 700,
    fontSize: 19,
    lineHeight: 38 / 19,
  },
  logo: { height: 40, maxWidth: 140, objectFit: 'contain' },
  companyName: {
    fontSize: 13,
    fontFamily: SANS,
    fontWeight: 600,
    color: C.ink,
    letterSpacing: -0.1,
  },
  companyInfo: { fontSize: 9, color: C.fg3, marginTop: 1 },

  headRight: { alignItems: 'flex-end' },
  eyebrow: {
    fontFamily: MONO,
    fontWeight: 500,
    fontSize: 9,
    color: C.fg3,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  quoteNumber: {
    fontFamily: MONO,
    fontWeight: 600,
    fontSize: 22,
    color: C.ink,
    marginTop: 2,
    letterSpacing: -0.3,
  },

  divider: { borderBottomWidth: 1, borderBottomColor: C.border1, marginTop: 18, marginBottom: 16 },
  docTitle: {
    fontSize: 15,
    fontFamily: SANS,
    fontWeight: 600,
    color: C.ink,
    letterSpacing: -0.2,
    marginBottom: 14,
  },

  // ── Partes (PARA / status / datas) ──
  parties: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  label: {
    fontFamily: MONO,
    fontWeight: 500,
    fontSize: 8,
    color: C.fg3,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  customerName: { fontSize: 13, fontFamily: SANS, fontWeight: 600, color: C.ink },
  metaLine: { fontFamily: MONO, fontSize: 9, color: C.fg3, marginTop: 4 },
  metaStrong: { color: C.ink, fontFamily: MONO, fontWeight: 500 },

  // ── Badge ──
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 9999,
  },
  badgeDot: { width: 5, height: 5, borderRadius: 9999, marginRight: 6 },
  badgeText: { fontSize: 9, fontFamily: SANS, fontWeight: 600 },

  // ── Tabela de itens ──
  tHeadRow: {
    flexDirection: 'row',
    backgroundColor: C.slate50,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 1,
    borderColor: C.border1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  th: {
    fontFamily: SANS,
    fontWeight: 500,
    fontSize: 8,
    color: C.fg3,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tRow: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.border2,
  },
  tRowLast: { borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
  cDesc: { flex: 3.3 },
  cQty: { flex: 1, textAlign: 'right' },
  cPrice: { flex: 1.3, textAlign: 'right' },
  cTotal: { flex: 1.3, textAlign: 'right' },
  cellText: { fontSize: 10, color: C.ink },
  cellMuted: { fontSize: 10, color: C.fg2 },
  cellMono: { fontFamily: MONO, fontSize: 9.5, color: C.fg2 },
  cellMoney: { fontFamily: MONO, fontWeight: 600, fontSize: 9.5, color: C.ink },

  // ── Totais ──
  totalsWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  totalsBox: {
    width: 250,
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  tLineLabel: { fontSize: 10, color: C.fg3 },
  tLineValue: { fontFamily: MONO, fontWeight: 500, fontSize: 10, color: C.fg2 },
  tTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: C.purple50,
    borderTopWidth: 1,
    borderTopColor: C.border1,
  },
  tTotalLabel: { fontSize: 11, fontFamily: SANS, fontWeight: 600, color: C.purple800 },
  tTotalValue: {
    fontFamily: MONO,
    fontWeight: 600,
    fontSize: 14,
    color: C.purple700,
    letterSpacing: -0.2,
  },

  // ── Pix / observações ──
  infoCard: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pixKey: { fontFamily: MONO, fontSize: 11, color: C.ink, marginTop: 2 },
  notesText: { fontSize: 10, color: C.fg2, marginTop: 4, lineHeight: 1.55 },

  // ── Assinaturas ──
  signSection: { marginTop: 46, flexDirection: 'row', justifyContent: 'space-between', gap: 32 },
  signBox: { flex: 1 },
  signLine: { borderTopWidth: 1, borderTopColor: C.fg2, marginTop: 42, marginBottom: 5 },
  // Same line under a signature image, so both columns read the same way.
  signLineUnder: { borderTopWidth: 1, borderTopColor: C.fg2, marginTop: 2, marginBottom: 5 },
  signLabel: { fontSize: 9, color: C.fg3, textAlign: 'center' },
  signSub: { fontSize: 8, color: C.fg4, textAlign: 'center', marginTop: 1, fontFamily: MONO },
  signImage: {
    maxWidth: 170,
    maxHeight: 54,
    objectFit: 'contain',
    marginBottom: 4,
    alignSelf: 'center',
  },

  // ── Marca d'água (plano Livre) ──
  watermark: {
    position: 'absolute',
    top: '42%',
    left: '14%',
    fontSize: 50,
    fontFamily: SANS,
    fontWeight: 700,
    color: C.purple600,
    opacity: 0.07,
    transform: 'rotate(-32deg)',
  },

  // ── Rodapé ──
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: { fontSize: 8, color: C.fg3 },
  footerBrand: { fontSize: 8, color: C.purple600, fontFamily: SANS, fontWeight: 600 },
  footerPage: { fontSize: 8, color: C.fg4, fontFamily: MONO },
});

/**
 * Semântica de status no PDF (PB1-P12 — definição completa em
 * PDF-STATUS-SEMANTICS.md).
 *
 * O selo impresso no documento carimba o estado que era VERDADEIRO no
 * momento em que o PDF foi gerado — nunca um estado anterior ou posterior
 * da máquina (`QUOTE_ACTIONS` em @orcivo/shared-types, ADR-016):
 *
 * | Estado    | Selo      | Quando o PDF é carimbado com este estado            |
 * |-----------|-----------|-----------------------------------------------------|
 * | DRAFT     | Rascunho  | apenas preview sob demanda (`generatePdf`)          |
 * | SENT      | Enviado   | `send()` — o PDF anexado ao envio                   |
 * | APPROVED  | Aprovado  | `approve()` — regeneração pós-aprovação             |
 * | REJECTED  | Recusado  | apenas preview sob demanda de orçamento terminal   |
 * | CANCELLED | Cancelado | apenas preview sob demanda de orçamento terminal   |
 * | EXPIRED   | Expirado  | apenas preview sob demanda de orçamento terminal   |
 *
 * Garantias (AC2/AC3): um PDF enviado nunca exibe 'Rascunho', e o selo
 * sempre reflete o estado no instante da geração. recusar/cancelar/expirar
 * NÃO regeneram o artefato — o PDF conservado mantém o carimbo do momento
 * em que foi gerado (imutabilidade do documento enviado).
 */
export const QUOTE_PDF_STATUS_BADGE: Record<
  QuoteStatus,
  { bg: string; fg: string; label: string }
> = {
  DRAFT: { bg: C.slate100, fg: C.fg2, label: 'Rascunho' },
  SENT: { bg: C.infoBg, fg: C.infoFg, label: 'Enviado' },
  APPROVED: { bg: C.successBg, fg: C.successFg, label: 'Aprovado' },
  REJECTED: { bg: C.dangerBg, fg: C.dangerFg, label: 'Recusado' },
  CANCELLED: { bg: C.slate100, fg: C.fg3, label: 'Cancelado' },
  EXPIRED: { bg: C.warningBg, fg: C.warningFg, label: 'Expirado' },
};

/** Valor decimal na fronteira do renderer: string decimal ou Decimal (Prisma/decimal.js). */
type DecimalLike = string | { toString(): string };

interface QuoteData {
  number: number;
  /**
   * Estado carimbado no PDF (PB1-P12/AC3): o estado verdadeiro no momento
   * da geração — `send()` carimba SENT, `approve()` carimba APPROVED e o
   * preview sob demanda carimba o estado atual do orçamento.
   */
  status: QuoteStatus;
  title?: string | null;
  notes?: string | null;
  subtotal: DecimalLike;
  discount_type: string;
  discount_value: DecimalLike;
  total: DecimalLike;
  /** QuoteDocOptions (title + what is shown); missing = everything shown. */
  doc_options?: unknown;
  valid_until?: Date | null;
  created_at?: Date | null;
  items: Array<{
    description: string;
    quantity: DecimalLike;
    unit_price: DecimalLike;
    total: DecimalLike;
  }>;
  customer_name?: string | null;
  /** PB1-P10/AC2: signed URL of the technician's reusable signature, resolved by the caller for this render only. */
  technician_signature_url?: string | null;
  approval?: {
    approval_method: string;
    typed_name?: string | null;
    signature_image_url?: string | null;
    approved_at?: Date | null;
  } | null;
}

interface CompanyData {
  trade_name: string;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  logo_url?: string | null;
  pix_key?: string | null;
  plan_code: string;
}

function fmtDate(d?: Date | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

/** Quantidade sem zeros à direita: "4.000" → "4", "1.500" → "1,5". */
function fmtQty(q: DecimalLike): string {
  try {
    const n = new Decimal(q.toString());
    const s = n.toDecimalPlaces(3).toString();
    return s.replace('.', ',');
  } catch {
    return q.toString();
  }
}

@Injectable()
export class QuotePdfService {
  async generate(quote: QuoteData, company: CompanyData): Promise<Buffer> {
    const q = {
      ...quote,
      subtotal: quote.subtotal.toString(),
      discount_value: quote.discount_value.toString(),
      total: quote.total.toString(),
      items: quote.items.map((item) => ({
        ...item,
        quantity: item.quantity.toString(),
        unit_price: item.unit_price.toString(),
        total: item.total.toString(),
      })),
    };

    const showWatermark = company.plan_code === 'LIVRE';
    const location = [company.city, company.state].filter(Boolean).join(' · ');
    const hasDiscount = new Decimal(q.discount_value).greaterThan(0);
    // Discount shown in money (a percent discount_value is not an amount).
    const discountAmount = new Decimal(q.subtotal).minus(q.total).toFixed(2);
    const opts = resolveQuoteDocOptions(q.doc_options);
    const docTitle = QUOTE_DOC_TITLES[opts.title];
    const itemPrices = opts.item_prices;
    const anyPrice = opts.subtotal || opts.total;
    // Total sobre a máquina de estados: todo QuoteStatus tem selo definido
    // (PB1-P12/AC1). O guard abaixo é apenas defesa em runtime contra
    // valores fora da enum — nunca exibe rótulo de estado errado.
    const badge: { bg: string; fg: string; label: string } | undefined =
      QUOTE_PDF_STATUS_BADGE[q.status];
    const initial = (company.trade_name?.trim()?.[0] ?? 'O').toUpperCase();

    const doc = (
      <Document
        title={`${docTitle} #${q.number}`}
        author={company.trade_name}
        creator="Orcivo"
        producer="Orcivo"
      >
        <Page size="A4" style={styles.page}>
          {showWatermark && (
            <Text style={styles.watermark} fixed>
              Orcivo Livre
            </Text>
          )}

          {/* ── Cabeçalho ── */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              {company.logo_url ? (
                <Image style={styles.logo} src={company.logo_url} />
              ) : (
                <View style={styles.brandTile}>
                  <Svg width={38} height={38}>
                    <Defs>
                      <LinearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor={C.ink} />
                        <Stop offset="1" stopColor={C.purple600} />
                      </LinearGradient>
                    </Defs>
                    <Rect x={0} y={0} width={38} height={38} rx={10} fill="url(#brand)" />
                  </Svg>
                  <Text style={styles.brandLetter}>{initial}</Text>
                </View>
              )}
              {/* Name and contacts stay next to the logo too (same as the receipt). */}
              <View>
                <Text style={styles.companyName}>{company.trade_name}</Text>
                {company.phone ? <Text style={styles.companyInfo}>{company.phone}</Text> : null}
                {location ? <Text style={styles.companyInfo}>{location}</Text> : null}
              </View>
            </View>

            <View style={styles.headRight}>
              <Text style={styles.eyebrow}>{docTitle}</Text>
              <Text style={styles.quoteNumber}>#{q.number}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {q.title ? <Text style={styles.docTitle}>{q.title}</Text> : null}

          {/* ── Partes ── */}
          <View style={styles.parties}>
            <View>
              <Text style={styles.label}>Para</Text>
              <Text style={styles.customerName}>{q.customer_name ?? '—'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {badge && (
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <View style={[styles.badgeDot, { backgroundColor: badge.fg }]} />
                  <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
                </View>
              )}
              {q.created_at ? (
                <Text style={styles.metaLine}>
                  Emitido em <Text style={styles.metaStrong}>{fmtDate(q.created_at)}</Text>
                </Text>
              ) : null}
              {q.valid_until && opts.validity ? (
                <Text style={styles.metaLine}>
                  Válido até <Text style={styles.metaStrong}>{fmtDate(q.valid_until)}</Text>
                </Text>
              ) : null}
            </View>
          </View>

          {/* ── Tabela de itens ── */}
          <View>
            <View style={styles.tHeadRow}>
              <Text style={[styles.th, styles.cDesc]}>Descrição</Text>
              <Text style={[styles.th, styles.cQty]}>Qtd</Text>
              {itemPrices && <Text style={[styles.th, styles.cPrice]}>Preço un.</Text>}
              {itemPrices && <Text style={[styles.th, styles.cTotal]}>Total</Text>}
            </View>
            {q.items.map((item, i) => {
              const last = i === q.items.length - 1;
              return (
                <View key={i} style={[styles.tRow, last ? styles.tRowLast : {}]} wrap={false}>
                  <Text style={[styles.cellText, styles.cDesc]}>{item.description}</Text>
                  <Text style={[styles.cellMono, styles.cQty]}>{fmtQty(item.quantity)}</Text>
                  {itemPrices && (
                    <Text style={[styles.cellMono, styles.cPrice]}>
                      {formatMoney(item.unit_price)}
                    </Text>
                  )}
                  {itemPrices && (
                    <Text style={[styles.cellMoney, styles.cTotal]}>{formatMoney(item.total)}</Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* ── Totais ── */}
          {anyPrice && (
            <View style={styles.totalsWrap}>
              <View style={styles.totalsBox}>
                {opts.subtotal && (
                  <View style={styles.tLine}>
                    <Text style={styles.tLineLabel}>Subtotal</Text>
                    <Text style={styles.tLineValue}>{formatMoney(q.subtotal)}</Text>
                  </View>
                )}
                {opts.subtotal && hasDiscount && (
                  <View style={styles.tLine}>
                    <Text style={styles.tLineLabel}>
                      Desconto{q.discount_type === 'PERCENT' ? ` (${q.discount_value}%)` : ''}
                    </Text>
                    <Text style={styles.tLineValue}>− {formatMoney(discountAmount)}</Text>
                  </View>
                )}
                {opts.total && (
                  <View style={styles.tTotal}>
                    <Text style={styles.tTotalLabel}>Total</Text>
                    <Text style={styles.tTotalValue}>{formatMoney(q.total)}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ── Pix ── */}
          {company.pix_key && opts.pix ? (
            <View style={styles.infoCard} wrap={false}>
              <Text style={styles.label}>Pagamento via Pix</Text>
              <Text style={styles.pixKey}>{company.pix_key}</Text>
            </View>
          ) : null}

          {/* ── Observações ── */}
          {q.notes && opts.terms ? (
            <View style={[styles.infoCard, { backgroundColor: C.slate50 }]} wrap={false}>
              <Text style={styles.label}>Observações</Text>
              <Text style={styles.notesText}>{q.notes}</Text>
            </View>
          ) : null}

          {/* ── Assinaturas ── */}
          <View style={styles.signSection} wrap={false}>
            <View style={styles.signBox}>
              {q.technician_signature_url ? (
                <>
                  <Image style={styles.signImage} src={q.technician_signature_url} />
                  <View style={styles.signLineUnder} />
                </>
              ) : (
                <View style={styles.signLine} />
              )}
              <Text style={styles.signLabel}>{company.trade_name}</Text>
              <Text style={styles.signSub}>Responsável</Text>
            </View>
            {q.customer_name ? (
              <View style={styles.signBox}>
                {['DRAWN_SIGNATURE', 'PHOTO_SIGNATURE'].includes(
                  q.approval?.approval_method ?? '',
                ) && q.approval?.signature_image_url ? (
                  <>
                    <Image style={styles.signImage} src={q.approval.signature_image_url} />
                    <View style={styles.signLineUnder} />
                  </>
                ) : (
                  <View style={styles.signLine} />
                )}
                <Text style={styles.signLabel}>{q.approval?.typed_name ?? q.customer_name}</Text>
                <Text style={styles.signSub}>
                  {q.approval?.approved_at
                    ? `Aprovado em ${fmtDate(q.approval.approved_at)}`
                    : 'Cliente'}
                </Text>
              </View>
            ) : null}
          </View>

          {/* ── Rodapé ── */}
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>
              Gerado por <Text style={styles.footerBrand}>Orcivo</Text> — gestão para técnicos
              instaladores
            </Text>
            <Text
              style={styles.footerPage}
              render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`}
            />
          </View>
        </Page>
      </Document>
    );

    return renderToBuffer(doc) as Promise<Buffer>;
  }
}
