import { renderToBuffer } from '@react-pdf/renderer';
import { ReceiptPdfService } from './receipt-pdf.service';

function renderedText(value: unknown): string {
  if (value === null || value === undefined || typeof value === 'boolean') return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(renderedText).join(' ');
  if (typeof value === 'object' && 'props' in value) {
    return renderedText((value as { props?: { children?: unknown } }).props?.children);
  }
  return '';
}

const receipt = {
  number: 96,
  amount: '250.00',
  client: 'Condomínio Natureza',
  clientDetails: {
    document: '12345678901',
    phone: '11999998888',
    address: 'Rua das Flores, 100 · São Paulo/SP',
  },
  reference: 'manutenção preventiva (Serviço #42)',
  method: 'Pix',
  paidAt: new Date('2026-10-04T15:00:00-03:00'),
  additionalInfo: 'Pagamento confirmado pelo responsável financeiro.',
  signatureDataUri: 'data:image/png;base64,AA==',
  signerName: 'Arlindo Silva',
};

const company = {
  trade_name: 'Orcivo Serviços',
  document_type: 'CNPJ',
  document: '12345678000199',
  phone: '1130304040',
  address: 'Avenida Central, 500',
  city: 'São Paulo',
  state: 'SP',
  instagram: '@orcivo',
  website: 'orcivo.com.br',
  professional_registration: 'Registro 123',
  pix_key: 'pagamento@example.com',
  document_footer: 'Obrigado pela confiança.',
};

describe('ReceiptPdfService', () => {
  let service: ReceiptPdfService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReceiptPdfService();
  });

  it('renderiza declaração completa, adicionais, assinatura e rodapé com dinheiro string', async () => {
    await expect(service.generate(receipt, company)).resolves.toBeInstanceOf(Buffer);
    const [document] = (renderToBuffer as jest.Mock).mock.calls[0];
    const text = renderedText(document);

    expect(text).toContain('Declaro que recebi de');
    expect(text).toContain('Condomínio Natureza');
    expect(text).toContain('R$ 250,00');
    expect(text).toContain('04/10/2026');
    expect(text).toContain('Forma de pagamento');
    expect(text).toContain('Informações adicionais');
    expect(text).toContain('Pagamento confirmado pelo responsável financeiro.');
    expect(text).toContain('Arlindo Silva');
    expect(text).toContain('Registro 123');
    expect(text).toContain('Chave Pix:');
    expect(text).toContain('Obrigado pela confiança.');
  });

  it('respeita grupos desligados sem ocultar os campos essenciais', async () => {
    await service.generate(
      {
        ...receipt,
        docOptions: {
          company_details: false,
          client_details: false,
          payment_details: false,
          additional_info: false,
          pix: false,
          footer: false,
        },
        signatureDataUri: null,
        signerName: null,
      },
      company,
    );
    const [document] = (renderToBuffer as jest.Mock).mock.calls[0];
    const text = renderedText(document);

    expect(text).toContain('Orcivo Serviços');
    expect(text).toContain('Condomínio Natureza');
    expect(text).toContain('R$ 250,00');
    expect(text).toContain('04/10/2026');
    expect(text).not.toContain('Avenida Central');
    expect(text).not.toContain('(11) 99999-8888');
    expect(text).not.toContain('Forma de pagamento');
    expect(text).not.toContain('Informações adicionais');
    expect(text).not.toContain('Chave Pix:');
    expect(text).not.toContain('Obrigado pela confiança.');
  });
});
