const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

// Proxy público para POST /auth/reset-password. `code: INVALID_TOKEN` indica link inválido,
// expirado (15 min) ou já usado — o backend invalida o token após o primeiro uso.
export async function POST(req: Request): Promise<Response> {
  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ code: 'VALIDATION', message: 'Dados inválidos.' }, { status: 400 });
  }
  try {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) return Response.json({ ok: true });
    const data = (await res.json().catch(() => ({}))) as { message?: unknown };
    if (res.status === 400 && typeof data.message === 'string' && data.message.startsWith('Token inválido')) {
      return Response.json({ code: 'INVALID_TOKEN', message: data.message }, { status: 400 });
    }
    if (res.status === 400) {
      return Response.json({ code: 'VALIDATION', message: 'A senha deve ter entre 8 e 128 caracteres.' }, { status: 400 });
    }
    if (res.status === 429) {
      return Response.json({ code: 'RATE_LIMIT', message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }, { status: 429 });
    }
    return Response.json({ code: 'ERROR', message: 'Não foi possível redefinir a senha agora. Tente novamente.' }, { status: 502 });
  } catch {
    return Response.json({ code: 'ERROR', message: 'Serviço indisponível. Tente novamente em instantes.' }, { status: 502 });
  }
}
