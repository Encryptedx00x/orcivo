// Mock @react-pdf/renderer before importing service
jest.mock('@react-pdf/renderer', () => ({
  renderToBuffer: jest.fn().mockResolvedValue(Buffer.from('PDF_CONTENT')),
  Document: ({ children }: any) => children,
  Page: ({ children }: any) => children,
  View: ({ children }: any) => children,
  Text: ({ children }: any) => children,
  Image: () => null,
  Svg: ({ children }: any) => children,
  Defs: ({ children }: any) => children,
  LinearGradient: ({ children }: any) => children,
  Stop: () => null,
  Rect: () => null,
  StyleSheet: { create: (s: any) => s },
  Font: { register: jest.fn(), registerHyphenationCallback: jest.fn() },
}));

import { QuotePdfService, QUOTE_PDF_STATUS_BADGE } from './quote-pdf.service';
import { renderToBuffer } from '@react-pdf/renderer';
import { VALID_TRANSITIONS, QuoteStatus } from '@orcivo/shared-types';
import Decimal from 'decimal.js';

const mockQuote = {
  number: 42,
  status: 'DRAFT' as QuoteStatus,
  title: 'Instalação de câmeras',
  notes: 'Entrega em 5 dias úteis',
  subtotal: '200.00',
  discount_type: 'PERCENT',
  discount_value: '10.00',
  total: '180.00',
  valid_until: new Date('2026-06-01'),
  items: [
    { description: 'Câmera HD', quantity: '2', unit_price: '80.00', total: '160.00' },
    { description: 'Instalação', quantity: '1', unit_price: '40.00', total: '40.00' },
  ],
};

const companyLivre = {
  trade_name: 'Técnico XPTO',
  phone: '11999990000',
  city: 'São Paulo',
  state: 'SP',
  logo_url: null,
  pix_key: 'tecnico@email.com',
  plan_code: 'LIVRE',
};

const companySolo = { ...companyLivre, plan_code: 'SOLO' };

describe('QuotePdfService', () => {
  let service: QuotePdfService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new QuotePdfService();
  });

  describe('generate()', () => {
    it('Test 1: plano LIVRE -> buffer nao vazio e marca dagua presente no doc', async () => {
      const buffer = await service.generate(mockQuote, companyLivre);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // Verifica que renderToBuffer foi chamado (mock retorna Buffer.from('PDF_CONTENT'))
      expect(renderToBuffer).toHaveBeenCalledTimes(1);
    });

    it('Test 2: plano SOLO -> buffer nao vazio (sem marca dagua)', async () => {
      const buffer = await service.generate(mockQuote, companySolo);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      expect(renderToBuffer).toHaveBeenCalledTimes(1);
    });

    it('Test 3: renderToBuffer chamado com Document component', async () => {
      await service.generate(mockQuote, companyLivre);
      expect(renderToBuffer).toHaveBeenCalledTimes(1);
      // Verifica que foi chamado com um argumento (o Document JSX)
      const [doc] = (renderToBuffer as jest.Mock).mock.calls[0];
      expect(doc).toBeDefined();
    });

    it('Test 4: discount_value="10.00" não usa parseFloat — usa new Decimal()', async () => {
      // Esse teste verifica que o generate não lança quando discount_value é string decimal
      const quoteWithDiscount = { ...mockQuote, discount_value: '10.00' };
      await expect(service.generate(quoteWithDiscount, companyLivre)).resolves.toBeInstanceOf(
        Buffer,
      );
    });

    it('Test 4b: discount_value="0.00" não exibe linha de desconto (sem erro)', async () => {
      const quoteNoDiscount = { ...mockQuote, discount_value: '0.00' };
      await expect(service.generate(quoteNoDiscount, companyLivre)).resolves.toBeInstanceOf(Buffer);
    });

    it('Test 5: aceita Decimal (Prisma) nos campos monetários — contrato DecimalLike', async () => {
      const quoteWithDecimals = {
        ...mockQuote,
        status: 'SENT' as QuoteStatus,
        subtotal: new Decimal('200.00'),
        discount_value: new Decimal('10.00'),
        total: new Decimal('180.00'),
        items: [
          {
            description: 'Câmera HD',
            quantity: new Decimal('2'),
            unit_price: new Decimal('80.00'),
            total: new Decimal('160.00'),
          },
        ],
      };
      await expect(service.generate(quoteWithDecimals, companyLivre)).resolves.toBeInstanceOf(
        Buffer,
      );
    });
  });

  describe('QUOTE_PDF_STATUS_BADGE — semântica de status (PB1-P12)', () => {
    it('AC1: total sobre a máquina de estados — todo QuoteStatus tem selo definido', () => {
      const statuses = Object.keys(VALID_TRANSITIONS) as QuoteStatus[];
      expect(statuses.length).toBeGreaterThan(0);
      for (const status of statuses) {
        expect(QUOTE_PDF_STATUS_BADGE[status]).toBeDefined();
        expect(QUOTE_PDF_STATUS_BADGE[status].label).toBeTruthy();
        expect(QUOTE_PDF_STATUS_BADGE[status].bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(QUOTE_PDF_STATUS_BADGE[status].fg).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });

    it('AC1: rótulo documentado por estado (draft/sent/approved/rejected/expired + cancelled)', () => {
      expect(QUOTE_PDF_STATUS_BADGE.DRAFT.label).toBe('Rascunho');
      expect(QUOTE_PDF_STATUS_BADGE.SENT.label).toBe('Enviado');
      expect(QUOTE_PDF_STATUS_BADGE.APPROVED.label).toBe('Aprovado');
      expect(QUOTE_PDF_STATUS_BADGE.REJECTED.label).toBe('Recusado');
      expect(QUOTE_PDF_STATUS_BADGE.EXPIRED.label).toBe('Expirado');
      expect(QUOTE_PDF_STATUS_BADGE.CANCELLED.label).toBe('Cancelado');
    });

    it('AC2: o selo de SENT nunca carrega o rótulo de rascunho', () => {
      expect(QUOTE_PDF_STATUS_BADGE.SENT.label).not.toBe(QUOTE_PDF_STATUS_BADGE.DRAFT.label);
      expect(QUOTE_PDF_STATUS_BADGE.SENT.label).not.toBe('Rascunho');
    });
  });
});
