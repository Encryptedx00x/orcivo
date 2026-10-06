import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { Injectable } from '@nestjs/common';
import { formatMoney } from '@orcivo/shared-types';
import { registerPdfFonts } from '../quote/pdf-fonts';

registerPdfFonts();

// Layout "Recibo Papel" (docs/design-handoff/modo-facil/Recibo Papel.dc.html).
const C = {
  ink: '#0A0A0F',
  fg2: '#334155',
  fg3: '#475569',
  line: '#F1F5F9',
  border: '#E2E8F0',
  sigLine: '#94A3B8',
  slate50: '#F8FAFC',
  white: '#FFFFFF',
};

const s = StyleSheet.create({
  page: { padding: 48, fontFamily: 'Inter', fontSize: 11, color: C.ink, lineHeight: 1.5 },
  card: { borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 32, gap: 18 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.ink,
    justifyContent: 'center',
  },
  tileText: { color: C.white, fontSize: 15, fontWeight: 700, textAlign: 'center' },
  logo: { width: 110, height: 44, objectFit: 'contain' },
  company: { fontSize: 15, fontWeight: 700 },
  small: { fontSize: 10, color: C.fg3 },
  smallStrong: { fontSize: 10, color: C.fg3, fontWeight: 600 },
  divider: { height: 1, backgroundColor: C.line },
  amount: { fontSize: 30, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.25, marginTop: 2 },
  body: { fontSize: 12 },
  bold: { fontWeight: 700 },
  grid: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  value: { fontSize: 12, fontWeight: 600 },
  sigBox: { width: 260, gap: 6 },
  sigImage: { height: 56, objectFit: 'contain', alignSelf: 'flex-start' },
  sigLine: { height: 1, backgroundColor: C.sigLine },
  pix: { borderRadius: 12, backgroundColor: C.slate50, padding: 12, color: C.fg2, fontSize: 10 },
});

export interface ReceiptData {
  number: number;
  amount: string;
  client: string;
  reference: string;
  method: string;
  paidAt: Date;
  signatureDataUri?: string | null;
  signerName?: string | null;
}
export interface ReceiptCompany {
  trade_name: string;
  document_type?: string | null;
  document?: string | null;
  logo_url?: string | null;
  pix_key?: string | null;
}

export const receiptNumber = (n: number) => String(n).padStart(4, '0');

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'O';

@Injectable()
export class ReceiptPdfService {
  async generate(r: ReceiptData, company: ReceiptCompany): Promise<Buffer> {
    const doc = (
      <Document
        title={`Recibo nº ${receiptNumber(r.number)}`}
        author={company.trade_name}
        creator="Orcivo"
        producer="Orcivo"
      >
        <Page size="A4" style={s.page}>
          <View style={s.card}>
            <View style={s.head}>
              {company.logo_url ? (
                <Image style={s.logo} src={company.logo_url} />
              ) : (
                <View style={s.tile}>
                  <Text style={s.tileText}>{initials(company.trade_name)}</Text>
                </View>
              )}
              <View>
                <Text style={s.company}>{company.trade_name}</Text>
                {company.document ? (
                  <Text style={s.small}>
                    {company.document_type ?? 'Documento'} {company.document}
                  </Text>
                ) : null}
              </View>
            </View>
            <Text style={s.smallStrong}>Recibo nº {receiptNumber(r.number)}</Text>
            <View style={s.divider} />
            <View>
              <Text style={s.smallStrong}>Valor recebido</Text>
              <Text style={s.amount}>{formatMoney(r.amount)}</Text>
            </View>
            <Text style={s.body}>
              Recebi de <Text style={s.bold}>{r.client}</Text> o valor acima, referente a{' '}
              {r.reference}.
            </Text>
            <View style={s.grid}>
              <View style={s.col}>
                <Text style={s.small}>Forma de pagamento</Text>
                <Text style={s.value}>{r.method}</Text>
              </View>
              <View style={s.col}>
                <Text style={s.small}>Data</Text>
                <Text style={s.value}>
                  {r.paidAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                </Text>
              </View>
            </View>
            {r.signatureDataUri ? (
              <View style={s.sigBox}>
                <Image style={s.sigImage} src={r.signatureDataUri} />
                <View style={s.sigLine} />
                <Text style={s.small}>
                  {r.signerName ? `${r.signerName} · Técnico` : 'Técnico'}
                </Text>
              </View>
            ) : null}
            {company.pix_key ? <Text style={s.pix}>Chave Pix: {company.pix_key}</Text> : null}
          </View>
        </Page>
      </Document>
    );
    return renderToBuffer(doc);
  }
}
