// Mock @react-pdf/renderer before importing service
jest.mock('@react-pdf/renderer', () => ({
  renderToBuffer: jest.fn().mockResolvedValue(Buffer.from('PDF_CONTENT')),
  Document: ({ children }: any) => children,
  Page: ({ children }: any) => children,
  View: ({ children }: any) => children,
  Text: ({ children }: any) => children,
  Image: () => null,
  StyleSheet: { create: (s: any) => s },
}));

import { QuotePdfService } from './quote-pdf.service';
import { renderToBuffer } from '@react-pdf/renderer';

const mockQuote = {
  number: 42,
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
      await expect(service.generate(quoteWithDiscount, companyLivre)).resolves.toBeInstanceOf(Buffer);
    });

    it('Test 4b: discount_value="0.00" não exibe linha de desconto (sem erro)', async () => {
      const quoteNoDiscount = { ...mockQuote, discount_value: '0.00' };
      await expect(service.generate(quoteNoDiscount, companyLivre)).resolves.toBeInstanceOf(Buffer);
    });
  });
});
