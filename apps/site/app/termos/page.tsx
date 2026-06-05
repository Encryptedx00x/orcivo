import Link from 'next/link';

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/" className="text-xl font-bold text-primary-600">Orcivo</Link>
        </div>
      </header>
      <article className="max-w-2xl mx-auto px-6 py-16 prose prose-gray">
        <h1>Termos de Uso</h1>
        <p><strong>Vigência:</strong> 2026-01-01</p>
        <p><strong>Contato:</strong> suporte@orcivo.com.br</p>

        <h2>1. Aceitação</h2>
        <p>Ao criar uma conta no Orcivo, você aceita estes Termos de Uso.</p>

        <h2>2. Serviço</h2>
        <p>O Orcivo é um software de gestão para técnicos instaladores, disponível em planos gratuito e pagos.</p>

        <h2>3. Conta</h2>
        <p>Você é responsável por manter a confidencialidade de suas credenciais de acesso.</p>

        <h2>4. Pagamentos</h2>
        <p>Planos pagos são cobrados via Asaas. O cancelamento pode ser feito a qualquer momento pelo painel.</p>

        <h2>5. Limitações</h2>
        <p>O Orcivo não se responsabiliza por perdas de dados causadas por uso indevido.</p>

        <p className="text-sm text-gray-500 mt-12">
          {/* TODO: revisar com consultoria jurídica antes do lançamento (Fase 6) */}
          Documento provisório — sujeito a revisão por consultoria jurídica.
        </p>
      </article>
    </div>
  );
}
