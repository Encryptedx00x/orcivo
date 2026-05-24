import { AuthArtPanel } from '../../components/AuthArtPanel';

export default function AuthLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      <AuthArtPanel
        headline="Orçamentos profissionais. Em minutos."
        sub="A plataforma feita para técnicos instaladores criarem orçamentos, organizarem serviços e atenderem melhor seus clientes pelo celular e pelo computador."
        testimonialQuote="Antes eu fazia orçamento no Word às 22h. Agora eu faço no celular dentro do cliente, e ele já assina ali."
        testimonialWho="Marcos Pereira"
        testimonialRole="Elétrica · São Paulo"
      />
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        alignItems: 'center', padding: '40px 32px', backgroundColor: '#FFFFFF',
        minHeight: '100vh',
      }}>
        <div />
        <div style={{ width: '100%', maxWidth: 400 }}>
          {children}
        </div>
        <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>
          © 2026 Orcivo
        </p>
      </div>
    </div>
  );
}
