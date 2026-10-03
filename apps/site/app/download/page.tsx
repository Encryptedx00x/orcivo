import Link from 'next/link';
import { pageMetadata } from '../seo';

export const metadata = pageMetadata(
  'Baixar o app | Orcivo',
  'Baixe o aplicativo Orcivo para Android direto por aqui — sem precisar da Play Store.',
  '/download',
  true,
);

// Atualizar esta URL quando o APK for gerado (EAS Build) e enviado pro MinIO.
const ANDROID_APK_URL = 'https://s3.orcivo.com.br/orcivo-public/orcivo-latest.apk';

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/" className="text-xl font-bold text-primary-600">
            Orcivo
          </Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-slate-900">Baixar o app Orcivo</h1>
        <p className="mt-4 text-slate-600">
          O app Android está disponível aqui direto, sem passar pela Play Store.
        </p>

        <a
          href={ANDROID_APK_URL}
          className="mt-8 inline-block rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white"
        >
          Baixar para Android (.apk)
        </a>

        <div className="mt-10 prose prose-gray prose-sm">
          <h2>Como instalar</h2>
          <ol>
            <li>Toque no botão acima pelo navegador do celular.</li>
            <li>
              O Android vai avisar que o arquivo vem de fora da Play Store. Toque em{' '}
              <strong>&quot;Instalar assim mesmo&quot;</strong> ou ative{' '}
              <strong>&quot;Instalar apps desconhecidos&quot;</strong> para o navegador, se pedido.
            </li>
            <li>Abra o app Orcivo normalmente após a instalação.</li>
          </ol>
          <p>
            iOS ainda não está disponível — depende da assinatura do Apple Developer Program pelo
            responsável da conta Orcivo.
          </p>
        </div>
      </main>
    </div>
  );
}
