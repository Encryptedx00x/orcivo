import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-slate-100 bg-white py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-sm text-slate-500">© 2026 Orcivo</span>
        <nav aria-label="Links do rodapé" className="flex flex-wrap justify-center gap-x-6 gap-y-3">
          <Link
            href="/planos"
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            Planos
          </Link>
          <Link
            href="/download"
            className="hidden sm:inline text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            Baixar app
          </Link>
          <Link
            href="/termos"
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            Termos de Uso
          </Link>
          <Link
            href="/privacidade"
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            Privacidade
          </Link>
        </nav>
      </div>
    </footer>
  );
}
