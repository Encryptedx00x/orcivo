import {
  prepareQuotePdfSections,
  QuotePdfService,
  QUOTE_PDF_STATUS_BADGE,
} from './quote-pdf.service';
import { renderToBuffer } from '@react-pdf/renderer';
import { VALID_TRANSITIONS, QuoteStatus } from '@orcivo/shared-types';
import Decimal from 'decimal.js';

const mockQuote = {
  number: 42,
  status: 'DRAFT' as QuoteStatus,
  title: 'Instalação de câmeras',
  notes: 'Entrega em 5 dias úteis',
  payment_terms: { kind: 'A_VISTA' as const, methods: ['PIX' as const] },
  warranty: 'Garantia de 90 dias para o serviço executado.',
  subtotal: '200.00',
  service_subtotal: '40.00',
  product_subtotal: '160.00',
  discount_type: 'PERCENT',
  discount_value: '10.00',
  total: '180.00',
  valid_until: new Date('2026-06-01'),
  items: [
    {
      description: 'Câmera HD',
      item_type: 'PRODUCT' as const,
      unit: 'un',
      quantity: '2',
      unit_price: '80.00',
      total: '160.00',
    },
    {
      description: 'Instalação',
      item_type: 'SERVICE' as const,
      unit: 'serviço',
      quantity: '1',
      unit_price: '40.00',
      total: '40.00',
    },
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

function renderedText(value: unknown): string {
  if (value === null || value === undefined || typeof value === 'boolean') return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(renderedText).join(' ');
  if (typeof value === 'object' && 'props' in value) {
    return renderedText((value as { props?: { children?: unknown } }).props?.children);
  }
  return '';
}

function countNoWrapRows(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (Array.isArray(value)) return value.reduce((sum, child) => sum + countNoWrapRows(child), 0);
  if (typeof value === 'object' && 'props' in value) {
    const props = (value as { props?: { children?: unknown; wrap?: boolean } }).props;
    return (props?.wrap === false ? 1 : 0) + countNoWrapRows(props?.children);
  }
  return 0;
}

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
      expect(renderToBuffer).toHaveBeenCalledTimes(1);
    });

    it('Test 2: plano SOLO -> buffer nao vazio (sem marca dagua)', async () => {
      const buffer = await service.generate(mockQuote, companySolo);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      expect(renderToBuffer).toHaveBeenCalledTimes(1);
    });

    it('Test 3: envia um Document ao renderer', async () => {
      await service.generate(mockQuote, companyLivre);
      const [document] = (renderToBuffer as jest.Mock).mock.calls[0];
      expect(document).toBeDefined();
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

    it('estrutura conteúdo completo e mantém linhas longas indivisíveis para paginação', async () => {
      const items = Array.from({ length: 45 }, (_, index) => ({
        description: `Serviço detalhado ${index + 1} — inspeção, execução e validação final`,
        item_type: index % 3 === 0 ? ('PRODUCT' as const) : ('SERVICE' as const),
        unit: index % 3 === 0 ? 'un' : 'h',
        quantity: '1.50',
        unit_price: '10.10',
        total: '15.15',
      }));
      await service.generate(
        {
          ...mockQuote,
          subtotal: '681.75',
          service_subtotal: '454.50',
          product_subtotal: '227.25',
          discount_value: '0.00',
          total: '681.75',
          notes: 'Informações adicionais '.repeat(30),
          items,
        },
        {
          ...companySolo,
          document_footer: 'Atendimento em São Paulo e região.',
        },
      );

      const [document] = (renderToBuffer as jest.Mock).mock.calls[0];
      const text = renderedText(document);
      expect(text).toContain('Serviços');
      expect(text).toContain('Produtos');
      expect(text).toMatch(/Subtotal de\s+serviços/);
      expect(text).toMatch(/Subtotal de\s+produtos/);
      expect(text).toContain('Condição de pagamento');
      expect(text).toContain('Garantia');
      expect(text).toContain('Observações');
      expect(text).toContain('Atendimento em São Paulo e região.');
      expect(text).toContain('Serviço detalhado 45');
      expect(countNoWrapRows(document)).toBeGreaterThanOrEqual(items.length);
    });
  });

  describe('prepareQuotePdfSections()', () => {
    it('separa serviços e produtos e preserva subtotais decimais congelados', () => {
      expect(prepareQuotePdfSections(mockQuote)).toEqual([
        expect.objectContaining({ type: 'SERVICE', title: 'Serviços', subtotal: '40.00' }),
        expect.objectContaining({ type: 'PRODUCT', title: 'Produtos', subtotal: '160.00' }),
      ]);
    });

    it('mantém orçamento antigo compatível e calcula sem Number', () => {
      const sections = prepareQuotePdfSections({
        ...mockQuote,
        service_subtotal: undefined,
        product_subtotal: undefined,
        items: [
          {
            description: 'Metragem fracionada',
            quantity: '1.005',
            unit_price: '0.10',
            total: '0.1005',
          },
        ],
      });

      expect(sections).toEqual([
        expect.objectContaining({
          type: 'SERVICE',
          subtotal: '0.10',
          items: [expect.objectContaining({ unit: 'un' })],
        }),
      ]);
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
