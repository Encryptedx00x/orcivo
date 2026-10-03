import { cookies } from 'next/headers';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

type InviteCode = 'NOT_FOUND' | 'EXPIRED' | 'ALREADY_USED' | 'NEEDS_ACCOUNT' | 'ACCOUNT_EXISTS' | 'ERROR';

function fail(code: InviteCode, message: string, status: number): Response {
  return Response.json({ code, message }, { status });
}

function accept(token: string, auth: string | undefined, name?: string, password?: string): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) headers['Authorization'] = `Bearer ${auth}`;
  return fetch(`${API_URL}/invites/accept`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ token, name, password }),
  });
}

// Proxy público para POST /invites/accept. Classifica os 3 estados do convite (válido → ok,
// expirado, já aceito) a partir da resposta do backend, que não expõe um GET de pré-validação.
export async function POST(req: Request, { params }: { params: { token: string } }): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { name?: unknown; password?: unknown };
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : undefined;
  const password = typeof body.password === 'string' && body.password ? body.password : undefined;
  let authToken = cookies().get('access_token')?.value;

  try {
    let res = await accept(params.token, authToken, name, password);
    // Sessão expirada/inválida: tenta de novo como anônimo em vez de falhar o convite.
    if (res.status === 401 && authToken) {
      authToken = undefined;
      res = await accept(params.token, undefined, name, password);
    }

    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as { company?: { trade_name?: string } };
      return Response.json({ ok: true, authenticated: Boolean(authToken), companyName: data.company?.trade_name ?? null });
    }

    const data = (await res.json().catch(() => ({}))) as { message?: unknown };
    const message = typeof data.message === 'string' ? data.message : '';
    if (res.status === 404) {
      return fail('NOT_FOUND', 'Este convite não existe ou o link está incorreto. Peça um novo convite a quem convidou você.', 404);
    }
    if (res.status === 400 && message.startsWith('Convite expirado')) {
      return fail('EXPIRED', 'Este convite expirou. Peça um novo convite a quem convidou você.', 400);
    }
    if (res.status === 400 && message.startsWith('Convite já foi usado')) {
      return fail('ALREADY_USED', 'Este convite já foi aceito (ou expirou/foi cancelado). Se você já aceitou, é só entrar na sua conta.', 400);
    }
    if (res.status === 400 && message.startsWith('Nome e senha')) {
      return fail('NEEDS_ACCOUNT', 'Informe seu nome e uma senha para criar a conta, ou entre na sua conta e abra este link novamente.', 400);
    }
    if (res.status >= 500 && !authToken) {
      // Convite para um e-mail que já tem conta: o backend não cria usuário duplicado.
      return fail('ACCOUNT_EXISTS', 'Não foi possível criar sua conta. Se você já tem conta com o e-mail do convite, entre nela e abra este link novamente.', 409);
    }
    return fail('ERROR', 'Não foi possível aceitar o convite agora. Tente novamente.', 502);
  } catch {
    return fail('ERROR', 'Serviço indisponível. Tente novamente em instantes.', 502);
  }
}
