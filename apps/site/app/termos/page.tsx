import Link from 'next/link';

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/" className="text-xl font-bold text-primary-600">Orcivo</Link>
        </div>
      </header>
      <article className="max-w-2xl mx-auto px-6 py-16 prose prose-gray">
        <h1>Termos de Uso</h1>
        <p><strong>VigÃªncia:</strong> 2026-01-01</p>
        <p><strong>Contato:</strong> suporte@orcivo.com.br</p>

        <h2>1. AceitaÃ§Ã£o</h2>
        <p>Ao criar uma conta no Orcivo, vocÃª aceita estes Termos de Uso.</p>

        <h2>2. ServiÃ§o</h2>
        <p>O Orcivo Ã© um software de gestÃ£o para tÃ©cnicos instaladores, disponÃ­vel em planos gratuito e pagos.</p>

        <h2>3. Conta</h2>
        <p>VocÃª Ã© responsÃ¡vel por manter a confidencialidade de suas credenciais de acesso.</p>

        <h2>4. Pagamentos</h2>
        <p>Planos pagos sÃ£o cobrados via Asaas. O cancelamento pode ser feito a qualquer momento pelo painel.</p>

        <h2>5. LimitaÃ§Ãµes</h2>
        <p>O Orcivo nÃ£o se responsabiliza por perdas de dados causadas por uso indevido.</p>

        <p className="text-sm text-slate-500 mt-12">
          {/* TODO: revisar com consultoria jurÃ­dica antes do lanÃ§amento (Fase 6) */}
          Documento provisÃ³rio â€” sujeito a revisÃ£o por consultoria jurÃ­dica.
        </p>
      </article>
    </div>
  );
}

