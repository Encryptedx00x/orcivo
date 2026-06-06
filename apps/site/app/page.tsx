import Link from 'next/link';
import { Zap, FileText, MessageCircle } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-primary-600">Orcivo</span>
          <nav className="flex items-center gap-6">
            <Link href="/planos" className="text-sm text-slate-600 hover:text-slate-900">Planos</Link>
            <Link href="https://app.orcivo.com.br/login" className="text-sm font-medium text-primary-600 hover:text-primary-700">Entrar</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center py-24 px-6 text-center bg-gradient-to-b from-primary-50 to-white">
        <div className="max-w-2xl">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight mb-6">
            Gestão para<br />
            <span className="text-primary-600">técnicos instaladores</span>
          </h1>
          <p className="text-xl text-slate-600 mb-10">
            Orçamentos, OS, PDF e aprovação pelo WhatsApp — tudo no celular.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="https://app.orcivo.com.br/signup"
              className="px-8 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
            >
              Criar conta grátis
            </Link>
            <Link
              href="/planos"
              className="px-8 py-3 border border-primary-600 text-primary-600 font-semibold rounded-lg hover:bg-primary-50 transition-colors"
            >
              Ver planos
            </Link>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Por que o Orcivo?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="inline-flex p-3 bg-primary-100 rounded-xl mb-4">
                <Zap className="text-primary-600" size={24} />
              </div>
              <h3 className="text-lg font-semibold mb-2">Orçamento em 2 minutos</h3>
              <p className="text-slate-600">Monte orçamentos profissionais direto do celular, sem precisar de computador.</p>
            </div>
            <div className="text-center p-6">
              <div className="inline-flex p-3 bg-primary-100 rounded-xl mb-4">
                <FileText className="text-primary-600" size={24} />
              </div>
              <h3 className="text-lg font-semibold mb-2">PDF com sua logo</h3>
              <p className="text-slate-600">Gere PDFs com a identidade visual da sua empresa de forma automática.</p>
            </div>
            <div className="text-center p-6">
              <div className="inline-flex p-3 bg-primary-100 rounded-xl mb-4">
                <MessageCircle className="text-primary-600" size={24} />
              </div>
              <h3 className="text-lg font-semibold mb-2">Aprovação pelo WhatsApp</h3>
              <p className="text-slate-600">Envie o orçamento e receba aprovação do cliente sem sair do aplicativo.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Como funciona</h2>
          <div className="space-y-8">
            {[
              { step: 1, text: 'Cadastre seus serviços e produtos no catálogo' },
              { step: 2, text: 'Monte o orçamento no celular em minutos' },
              { step: 3, text: 'Envie pelo WhatsApp e receba a aprovação do cliente' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-center gap-6 text-left">
                <div className="w-12 h-12 flex-shrink-0 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  {step}
                </div>
                <p className="text-lg text-slate-700">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 px-6 bg-primary-600 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Comece grátis. Sem cartão de crédito.</h2>
        <p className="text-primary-100 mb-8">Crie sua conta agora e comece a usar o Orcivo Livre.</p>
        <Link
          href="https://app.orcivo.com.br/signup"
          className="inline-block px-10 py-4 bg-white text-primary-600 font-bold rounded-lg hover:bg-primary-50 transition-colors"
        >
          Criar conta no Orcivo
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-slate-500">© 2026 Orcivo</span>
          <nav className="flex gap-6">
            <Link href="/planos" className="text-sm text-slate-500 hover:text-slate-900">Planos</Link>
            <Link href="/termos" className="text-sm text-slate-500 hover:text-slate-900">Termos de Uso</Link>
            <Link href="/privacidade" className="text-sm text-slate-500 hover:text-slate-900">Privacidade</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
