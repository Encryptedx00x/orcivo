import { AuthArtPanel } from '../../components/AuthArtPanel';
import { BrandMark } from '../../components/BrandMark';

export default function AuthLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div
      className="ov-auth-grid"
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'clamp(520px, 42%, 700px) 1fr',
      }}
    >
      <div className="ov-auth-art">
        <AuthArtPanel
          headline="Orçamentos profissionais. Em minutos."
          sub="A plataforma feita para técnicos instaladores criarem orçamentos, organizarem serviços e atenderem melhor seus clientes pelo celular e pelo computador."
          testimonialQuote="Antes eu fazia orçamento no Word às 22h. Agora eu faço no celular dentro do cliente, e ele já assina ali."
          testimonialWho="Marcos Pereira"
          testimonialRole="Elétrica · São Paulo"
        />
      </div>
      <div
        className="ov-auth-form-col"
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '32px 48px',
          backgroundColor: '#FFFFFF',
          minHeight: '100vh',
        }}
      >
        <div className="ov-show-mobile" style={{ width: '100%', maxWidth: 400, marginBottom: 24 }}>
          <BrandMark size={28} />
        </div>
        <div className="ov-hide-mobile" />
        <div style={{ width: '100%', maxWidth: 400 }}>{children}</div>
        <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>© 2026 Orcivo</p>
      </div>
    </div>
  );
}
