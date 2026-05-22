const API_URL = process.env.API_URL ?? 'https://api.seudominio.com.br';

async function getHealth(): Promise<{ status: string; timestamp: string } | null> {
  try {
    const res = await fetch(`${API_URL}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return res.json() as Promise<{ status: string; timestamp: string }>;
  } catch {
    return null;
  }
}

export default async function Home() {
  const health = await getHealth();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-white">
      <h1 className="text-4xl font-bold text-[#6D28D9] mb-2">Orcivo</h1>
      <p className="text-gray-500 mb-12 text-sm">Para técnicos que constroem negócios</p>

      <div className="w-full max-w-sm border border-gray-200 rounded-xl p-8 bg-gray-50 text-center">
        {health ? (
          <>
            <p className="text-2xl font-semibold text-emerald-600 mb-2">Backend OK</p>
            <p className="text-xs text-gray-400">{health.timestamp}</p>
          </>
        ) : (
          <>
            <p className="text-2xl font-semibold text-red-600 mb-2">Backend indisponível</p>
            <p className="text-xs text-gray-400">{API_URL}</p>
          </>
        )}
      </div>

      <p className="mt-8 text-xs text-gray-300">Fase 0 — Hello World</p>
    </main>
  );
}
