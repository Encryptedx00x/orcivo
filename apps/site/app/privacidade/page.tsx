import Link from 'next/link';

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/" className="text-xl font-bold text-primary-600">Orcivo</Link>
        </div>
      </header>
      <article className="max-w-2xl mx-auto px-6 py-16 prose prose-gray">
        <h1>PolÃ­tica de Privacidade</h1>
        <p><strong>VigÃªncia:</strong> 2026-01-01</p>
        <p><strong>Contato:</strong> suporte@orcivo.com.br</p>

        <h2>1. Dados coletados</h2>
        <p>Coletamos nome, e-mail e dados de uso para operaÃ§Ã£o do serviÃ§o.</p>

        <h2>2. Uso dos dados</h2>
        <p>Os dados sÃ£o usados exclusivamente para prestaÃ§Ã£o do serviÃ§o Orcivo e comunicaÃ§Ãµes relacionadas.</p>

        <h2>3. Compartilhamento</h2>
        <p>NÃ£o vendemos dados a terceiros. Compartilhamos apenas com processadores de pagamento (Asaas) e provedores de infraestrutura.</p>

        <h2>4. Seus direitos (LGPD)</h2>
        <p>VocÃª pode solicitar acesso, correÃ§Ã£o ou exclusÃ£o dos seus dados pelo e-mail suporte@orcivo.com.br.</p>

        <h2>5. RetenÃ§Ã£o</h2>
        <p>Dados sÃ£o retidos enquanto a conta estiver ativa e por atÃ© 5 anos apÃ³s encerramento, conforme obrigaÃ§Ãµes legais.</p>

        <p className="text-sm text-slate-500 mt-12">
          {/* TODO: revisar com consultoria jurÃ­dica antes do lanÃ§amento (Fase 6) */}
          Documento provisÃ³rio â€” sujeito a revisÃ£o por consultoria jurÃ­dica.
        </p>
      </article>
    </div>
  );
}

