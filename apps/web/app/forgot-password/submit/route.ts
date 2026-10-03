const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

// Proxy público para POST /auth/forgot-password. O backend responde sempre 200 (não revela se o
// e-mail existe), então o front mostra a mesma mensagem de sucesso em qualquer caso.
export async function POST(req: Request): Promise<Response> {
  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ message: 'Informe um e-mail válido.' }, { status: 400 });
  }
  try {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) return Response.json({ ok: true });
    if (res.status === 429) {
      return Response.json({ message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }, { status: 429 });
    }
    if (res.status === 400) {
      return Response.json({ message: 'Informe um e-mail válido.' }, { status: 400 });
    }
    return Response.json({ message: 'Não foi possível enviar o e-mail agora. Tente novamente.' }, { status: 502 });
  } catch {
    return Response.json({ message: 'Serviço indisponível. Tente novamente em instantes.' }, { status: 502 });
  }
}
