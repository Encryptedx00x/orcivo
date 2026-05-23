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

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11, color: '#0A0A0F' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  logo: { width: 80, height: 40, objectFit: 'contain' },
  companyName: { fontSize: 14, fontWeight: 'bold' },
  companyInfo: { fontSize: 9, color: '#666', marginTop: 2 },
  quoteTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  section: { marginTop: 16 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: '6 4',
    borderRadius: 2,
    marginTop: 8,
  },
  tableRow: {
    flexDirection: 'row',
    padding: '5 4',
    borderBottom: '1px solid #E5E7EB',
  },
  col_desc: { flex: 3, fontSize: 10 },
  col_qty: { flex: 1, textAlign: 'right', fontSize: 10 },
  col_price: { flex: 1, textAlign: 'right', fontSize: 10 },
  col_total: { flex: 1, textAlign: 'right', fontSize: 10 },
  totalsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  totalsLabel: { width: 120, fontSize: 10, color: '#666' },
  totalsValue: { width: 80, textAlign: 'right', fontSize: 10 },
  totalFinal: { fontSize: 12, fontWeight: 'bold', color: '#6D28D9' },
  watermark: {
    position: 'absolute',
    opacity: 0.12,
    fontSize: 42,
    top: '38%',
    left: '5%',
    transform: 'rotate(-45deg)',
    color: '#6D28D9',
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 24,
    padding: '12 0',
    borderTop: '1px solid #E5E7EB',
    fontSize: 9,
    color: '#888',
  },
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
          {showWatermark && <Text style={styles.watermark}>Orcivo Livre</Text>}

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
            <View>
              <Text style={styles.quoteTitle}>Orçamento #{q.number}</Text>
              {q.title && (
                <Text style={{ fontSize: 10, color: '#666' }}>{q.title}</Text>
              )}
              {q.valid_until && (
                <Text style={{ fontSize: 9, color: '#999', marginTop: 4 }}>
                  Válido até: {new Date(q.valid_until).toLocaleDateString('pt-BR')}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.tableHeader}>
              <Text style={styles.col_desc}>Descrição</Text>
              <Text style={styles.col_qty}>Qtd</Text>
              <Text style={styles.col_price}>Preço unit.</Text>
              <Text style={styles.col_total}>Total</Text>
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

          <View style={[styles.section, { alignItems: 'flex-end' }]}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>R$ {q.subtotal}</Text>
            </View>
            {hasDiscount && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>
                  Desconto{' '}
                  {q.discount_type === 'PERCENT'
                    ? `(${q.discount_value}%)`
                    : ''}
                </Text>
                <Text style={styles.totalsValue}>
                  - R$ {q.discount_value}
                </Text>
              </View>
            )}
            <View style={[styles.totalsRow, { marginTop: 4 }]}>
              <Text style={[styles.totalsLabel, styles.totalFinal]}>Total</Text>
              <Text style={[styles.totalsValue, styles.totalFinal]}>
                R$ {q.total}
              </Text>
            </View>
          </View>

          {company.pix_key && (
            <View style={[styles.section, { marginTop: 20 }]}>
              <Text style={{ fontSize: 9, color: '#666' }}>
                Chave Pix: {company.pix_key}
              </Text>
            </View>
          )}

          {q.notes && (
            <View style={styles.section}>
              <Text
                style={{ fontSize: 9, color: '#666', fontWeight: 'bold', marginBottom: 4 }}
              >
                Observações:
              </Text>
              <Text style={{ fontSize: 9, color: '#444' }}>{q.notes}</Text>
            </View>
          )}

          <View style={styles.footer}>
            <Text>
              Gerado pelo Orcivo — sistema de gestão para técnicos instaladores
            </Text>
          </View>
        </Page>
      </Document>
    );

    return renderToBuffer(doc) as Promise<Buffer>;
  }
}
