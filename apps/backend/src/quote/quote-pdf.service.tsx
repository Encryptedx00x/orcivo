import Decimal from 'decimal.js';
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer';
import { Injectable } from '@nestjs/common';

// ── Design tokens (espelham docs/design-handoff colors_and_type.css) ──
const C = {
  ink: '#0A0A0F',
  fg2: '#334155',
  fg3: '#64748B',
  border: '#E2E8F0',
  border2: '#F1F5F9',
  slate50: '#F8FAFC',
  purple600: '#6D28D9',
  purple50: '#F5F3FF',
  purple100: '#EDE9FE',
  purple800: '#4C1D95',
  white: '#FFFFFF',
};

const styles = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 48, paddingHorizontal: 0, fontFamily: 'Helvetica', fontSize: 10, color: C.ink, lineHeight: 1.45 },
  body: { paddingHorizontal: 40 },

  // Faixa superior de marca
  topBar: { height: 6, backgroundColor: C.purple600, width: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 28, marginBottom: 22 },
  logo: { width: 96, height: 40, objectFit: 'contain', marginBottom: 6 },
  companyName: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: C.ink },
  companyInfo: { fontSize: 9, color: C.fg3, marginTop: 2 },

  // Cartão do número do orçamento
  quoteCard: { backgroundColor: C.purple50, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, minWidth: 170 },
  quoteEyebrow: { fontSize: 8, color: C.purple800, letterSpacing: 1.2, fontFamily: 'Helvetica-Bold' },
  quoteNumber: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: C.purple800, marginTop: 2 },
  quoteMeta: { fontSize: 9, color: C.fg2, marginTop: 6 },
  quoteMetaStrong: { fontFamily: 'Helvetica-Bold', color: C.ink },

  // Bloco "Para o cliente"
  toBlock: { marginBottom: 18 },
  label: { fontSize: 8, color: C.fg3, letterSpacing: 1, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 3 },
  customerName: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.ink },

  // Tabela de itens
  tableHeader: { flexDirection: 'row', backgroundColor: C.slate50, paddingVertical: 7, paddingHorizontal: 10, borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottom: `1px solid ${C.border}` },
  th: { fontSize: 8, color: C.fg3, letterSpacing: 0.6, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, borderBottom: `1px solid ${C.border2}` },
  col_desc: { flex: 3.2, fontSize: 10, color: C.ink },
  col_qty: { flex: 1, textAlign: 'right', fontSize: 10, color: C.fg2 },
  col_price: { flex: 1.2, textAlign: 'right', fontSize: 10, color: C.fg2 },
  col_total: { flex: 1.2, textAlign: 'right', fontSize: 10, color: C.ink, fontFamily: 'Helvetica-Bold' },

  // Caixa de totais
  totalsWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  totalsBox: { width: 230, borderRadius: 8, border: `1px solid ${C.border}`, overflow: 'hidden' },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, paddingHorizontal: 14 },
  totalsLabel: { fontSize: 9, color: C.fg3 },
  totalsValue: { fontSize: 9, color: C.fg2 },
  totalFinalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: C.purple50, borderTop: `1px solid ${C.border}` },
  totalFinalLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.purple800 },
  totalFinalValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.purple800 },

  // Pix
  pixBox: { marginTop: 18, backgroundColor: C.slate50, borderRadius: 6, padding: 12, border: `1px solid ${C.border}` },

  // Observações
  section: { marginTop: 18 },
  notesText: { fontSize: 9, color: C.fg2, marginTop: 4 },

  // Assinaturas
  signatureSection: { marginTop: 44, flexDirection: 'row', justifyContent: 'space-between', gap: 28 },
  signatureBox: { flex: 1 },
  signatureLine: { borderTop: `1px solid ${C.fg2}`, marginTop: 44, marginBottom: 5 },
  signatureLabel: { fontSize: 9, color: C.fg3, textAlign: 'center' },
  signatureImage: { maxWidth: 180, maxHeight: 56, objectFit: 'contain', marginBottom: 4 },

  watermark: { position: 'absolute', opacity: 0.10, fontSize: 46, top: '40%', left: '8%', transform: 'rotate(-45deg)', color: C.purple600, fontFamily: 'Helvetica-Bold' },

  footer: { position: 'absolute', bottom: 22, left: 40, right: 40, paddingTop: 10, borderTop: `1px solid ${C.border}`, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: C.fg3 },
  footerBrand: { fontSize: 8, color: C.purple600, fontFamily: 'Helvetica-Bold' },
});

interface QuoteData {
  number: number;
  title?: string | null;
  notes?: string | null;
  subtotal: string;
  discount_type: string;
  discount_value: string;
  total: string;
  valid_until?: Date | null;
  items: Array<{
    description: string;
    quantity: string;
    unit_price: string;
    total: string;
  }>;
  customer_name?: string | null;
  approval?: {
    approval_method: string;
    typed_name?: string | null;
    signature_image_url?: string | null;
    approved_at: Date;
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

@Injectable()
export class QuotePdfService {
  async generate(quote: QuoteData, company: CompanyData): Promise<Buffer> {
    // Prisma retorna campos Decimal como objetos — converter para string antes do JSX
    const q: QuoteData = {
      ...quote,
      subtotal: quote.subtotal.toString(),
      discount_value: quote.discount_value.toString(),
      total: quote.total.toString(),
      items: quote.items.map(item => ({
        ...item,
        quantity: item.quantity.toString(),
        unit_price: item.unit_price.toString(),
        total: item.total.toString(),
      })),
    };

    const showWatermark = company.plan_code === 'LIVRE';
    const location = [company.city, company.state].filter(Boolean).join(' — ');
    // NUNCA usar parseFloat — usar new Decimal() para todas as comparações numéricas em campos monetários
    const hasDiscount = new Decimal(q.discount_value).greaterThan(0);

    const doc = (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.topBar} fixed />
          {showWatermark && <Text style={styles.watermark} fixed>Orcivo Livre</Text>}

          <View style={styles.body}>
            {/* Cabeçalho: empresa à esquerda, cartão do orçamento à direita */}
            <View style={styles.header}>
              <View>
                {company.logo_url && (
                  <Image style={styles.logo} src={company.logo_url} />
                )}
                <Text style={styles.companyName}>{company.trade_name}</Text>
                {company.phone && (
                  <Text style={styles.companyInfo}>{company.phone}</Text>
                )}
                {location && (
                  <Text style={styles.companyInfo}>{location}</Text>
                )}
              </View>
              <View style={styles.quoteCard}>
                <Text style={styles.quoteEyebrow}>ORÇAMENTO</Text>
                <Text style={styles.quoteNumber}>#{q.number}</Text>
                {q.title && (
                  <Text style={[styles.quoteMeta, { marginTop: 4 }]}>{q.title}</Text>
                )}
                {q.valid_until && (
                  <Text style={styles.quoteMeta}>
                    Válido até{' '}
                    <Text style={styles.quoteMetaStrong}>
                      {new Date(q.valid_until).toLocaleDateString('pt-BR')}
                    </Text>
                  </Text>
                )}
              </View>
            </View>

            {/* Para o cliente */}
            {q.customer_name && (
              <View style={styles.toBlock}>
                <Text style={styles.label}>Para</Text>
                <Text style={styles.customerName}>{q.customer_name}</Text>
              </View>
            )}

            {/* Tabela de itens */}
            <View>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, styles.col_desc]}>Descrição</Text>
                <Text style={[styles.th, styles.col_qty]}>Qtd</Text>
                <Text style={[styles.th, styles.col_price]}>Preço unit.</Text>
                <Text style={[styles.th, styles.col_total]}>Total</Text>
              </View>
              {q.items.map((item, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.col_desc}>{item.description}</Text>
                  <Text style={styles.col_qty}>{item.quantity}</Text>
                  <Text style={styles.col_price}>R$ {item.unit_price}</Text>
                  <Text style={styles.col_total}>R$ {item.total}</Text>
                </View>
              ))}
            </View>

            {/* Totais */}
            <View style={styles.totalsWrap}>
              <View style={styles.totalsBox}>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Subtotal</Text>
                  <Text style={styles.totalsValue}>R$ {q.subtotal}</Text>
                </View>
                {hasDiscount && (
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>
                      Desconto{' '}
                      {q.discount_type === 'PERCENT' ? `(${q.discount_value}%)` : ''}
                    </Text>
                    <Text style={styles.totalsValue}>- R$ {q.discount_value}</Text>
                  </View>
                )}
                <View style={styles.totalFinalRow}>
                  <Text style={styles.totalFinalLabel}>Total</Text>
                  <Text style={styles.totalFinalValue}>R$ {q.total}</Text>
                </View>
              </View>
            </View>

            {company.pix_key && (
              <View style={styles.pixBox}>
                <Text style={styles.label}>Pagamento via Pix</Text>
                <Text style={{ fontSize: 10, color: C.ink, marginTop: 2 }}>{company.pix_key}</Text>
              </View>
            )}

            {q.notes && (
              <View style={styles.section}>
                <Text style={styles.label}>Observações</Text>
                <Text style={styles.notesText}>{q.notes}</Text>
              </View>
            )}

            {/* Área de assinatura */}
            <View style={styles.signatureSection}>
              <View style={styles.signatureBox}>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureLabel}>{company.trade_name}</Text>
              </View>
              {q.customer_name && (
                <View style={styles.signatureBox}>
                  {q.approval?.approval_method === 'DRAWN_SIGNATURE' && q.approval.signature_image_url ? (
                    <Image style={styles.signatureImage} src={q.approval.signature_image_url} />
                  ) : (
                    <View style={styles.signatureLine} />
                  )}
                  <Text style={styles.signatureLabel}>
                    {q.approval?.typed_name ?? q.customer_name}
                    {q.approval?.approved_at
                      ? ` — ${new Date(q.approval.approved_at).toLocaleDateString('pt-BR')}`
                      : ''}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>
              Gerado por <Text style={styles.footerBrand}>Orcivo</Text> — gestão para técnicos instaladores
            </Text>
            <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          </View>
        </Page>
      </Document>
    );

    return renderToBuffer(doc) as Promise<Buffer>;
  }
}
