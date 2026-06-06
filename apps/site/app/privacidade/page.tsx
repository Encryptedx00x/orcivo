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
        <h1>Política de Privacidade</h1>
        <p><strong>Vigência:</strong> 2026-01-01</p>
        <p><strong>Contato:</strong> suporte@orcivo.com.br</p>

        <h2>1. Dados coletados</h2>
        <p>Coletamos nome, e-mail e dados de uso para operação do serviço.</p>

        <h2>2. Uso dos dados</h2>
        <p>Os dados são usados exclusivamente para prestação do serviço Orcivo e comunicações relacionadas.</p>

        <h2>3. Compartilhamento</h2>
        <p>Não vendemos dados a terceiros. Compartilhamos apenas com processadores de pagamento (Asaas) e provedores de infraestrutura.</p>

        <h2>4. Seus direitos (LGPD)</h2>
        <p>Você pode solicitar acesso, correção ou exclusão dos seus dados pelo e-mail suporte@orcivo.com.br.</p>

        <h2>5. Retenção</h2>
        <p>Dados são retidos enquanto a conta estiver ativa e por até 5 anos após encerramento, conforme obrigações legais.</p>

        <p className="text-sm text-slate-500 mt-12">
          Documento provisório — sujeito a revisão por consultoria jurídica antes do lançamento.
        </p>
      </article>
    </div>
  );
}
