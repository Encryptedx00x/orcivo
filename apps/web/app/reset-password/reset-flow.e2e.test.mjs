// E2E (HTTP-level) das telas públicas de recuperação de senha e convite.
//
// Não há navegador/Playwright no repositório, então o teste exercita o caminho real que o
// navegador percorre, sem simular nada do nosso código:
//   middleware.ts  →  route handlers /forgot-password/submit, /reset-password/submit,
//   /convite/[token]/submit  →  fetch HTTP  →  backend falso (contrato idêntico ao NestJS).
// Apenas 'next/server' e 'next/headers' são substituídos por stubs mínimos.
//
// Rodar: node --test apps/web/app/reset-password/reset-flow.e2e.test.mjs   (Node >= 22.15)
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { registerHooks } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const webRoot = fileURLToPath(new URL('../../', import.meta.url));

// ---- stubs de next/* ------------------------------------------------------------------------
const stubs = {
  'next/server': `
    export class NextResponse {
      constructor(kind, location) { this.kind = kind; this.location = location; this.cookies = { set() {} }; }
      static next() { return new NextResponse('next'); }
      static redirect(url) { return new NextResponse('redirect', String(url)); }
    }`,
  'next/headers': `
    export function cookies() {
      const jar = globalThis.__testCookies ?? {};
      return { get: (name) => (name in jar ? { name, value: jar[name] } : undefined) };
    }`,
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier in stubs) {
      return { url: `data:text/javascript,${encodeURIComponent(stubs[specifier])}`, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

// ---- backend falso --------------------------------------------------------------------------
const ctx = {
  users: new Map([['tecnico@exemplo.com.br', { id: 'u1', password: 'senha-antiga' }]]),
  resetTokens: new Map(), // token -> email
  mails: [],
  invites: new Map(),
  accepts: [],
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const backend = createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    const body = raw ? JSON.parse(raw) : {};
    if (req.method !== 'POST') return json(res, 404, { message: 'Not Found' });

    if (req.url === '/auth/forgot-password') {
      if (typeof body.email !== 'string' || !body.email.includes('@')) return json(res, 400, { message: 'Validation failed' });
      const user = ctx.users.get(body.email);
      if (user) {
        const token = randomUUID();
        ctx.resetTokens.set(token, body.email);
        ctx.mails.push({ to: body.email, html: `<a href="http://localhost:3001/reset-password?token=${token}">link</a>` });
      }
      return json(res, 200, {}); // sempre 200 — não revela se o e-mail existe
    }

    if (req.url === '/auth/reset-password') {
      if (!UUID_RE.test(body.token ?? '') || typeof body.new_password !== 'string' || body.new_password.length < 8 || body.new_password.length > 128) {
        return json(res, 400, { message: 'Validation failed' });
      }
      const email = ctx.resetTokens.get(body.token);
      if (!email) return json(res, 400, { message: 'Token inválido ou expirado' });
      ctx.users.get(email).password = body.new_password;
      ctx.resetTokens.delete(body.token); // uso único
      return json(res, 200, {});
    }

    if (req.url === '/invites/accept') {
      const auth = req.headers.authorization ?? null;
      ctx.accepts.push({ auth, body });
      const invite = ctx.invites.get(body.token);
      if (!invite) return json(res, 404, { message: 'Convite não encontrado.' });
      if (invite.status !== 'PENDING') return json(res, 400, { message: 'Convite já foi usado ou expirou.' });
      if (invite.expired) {
        invite.status = 'EXPIRED';
        return json(res, 400, { message: 'Convite expirado.' });
      }
      if (auth === 'Bearer expired-session') return json(res, 401, { message: 'Unauthorized' });
      if (!auth) {
        if (!body.name || !body.password) return json(res, 400, { message: 'Nome e senha são obrigatórios para criar conta.' });
        if (ctx.users.has(invite.email)) return json(res, 500, { message: 'Internal server error' });
      }
      invite.status = 'ACCEPTED';
      return json(res, 201, { company: { trade_name: 'Elétrica Silva' } });
    }

    return json(res, 404, { message: 'Not Found' });
  });
});

let mw;
let forgot;
let reset;
let convite;

before(async () => {
  await new Promise((resolve) => backend.listen(0, '127.0.0.1', resolve));
  process.env.API_URL = `http://127.0.0.1:${backend.address().port}`;
  const load = (rel) => import(pathToFileURL(webRoot + rel).href);
  mw = (await load('middleware.ts')).middleware;
  forgot = (await load('app/forgot-password/submit/route.ts')).POST;
  reset = (await load('app/reset-password/submit/route.ts')).POST;
  convite = (await load('app/convite/[token]/submit/route.ts')).POST;
});
after(() => backend.close());

const post = (body) => new Request('http://localhost:3001/x', { method: 'POST', body: JSON.stringify(body) });
const inviteCtx = (token) => ({ params: { token } });

function middlewareFor(pathname, cookies = {}) {
  const req = {
    url: `http://localhost:3001${pathname}`,
    nextUrl: { pathname },
    cookies: { get: (name) => (name in cookies ? { value: cookies[name] } : undefined) },
  };
  return mw(req);
}
// JWT válido por 1h, para o middleware não tentar renovar a sessão.
const liveJwt = `x.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.y`;

describe('AC8 — middleware libera as rotas públicas sem access_token', () => {
  const publicRoutes = [
    '/forgot-password',
    '/forgot-password/submit',
    '/reset-password',
    '/reset-password?token=abc',
    '/reset-password/submit',
    '/convite/11111111-1111-1111-1111-111111111111',
    '/convite/11111111-1111-1111-1111-111111111111/submit',
  ];
  for (const path of publicRoutes) {
    test(`anônimo acessa ${path} sem redirect para /login`, async () => {
      const pathname = path.split('?')[0];
      const res = await middlewareFor(pathname);
      assert.equal(res.kind, 'next');
    });
  }

  test('usuário já logado NÃO é redirecionado de /convite (aceita convite de outra empresa)', async () => {
    const res = await middlewareFor('/convite/abc', { access_token: liveJwt });
    assert.equal(res.kind, 'next');
  });

  test('usuário já logado também não é redirecionado de /forgot-password nem /reset-password', async () => {
    assert.equal((await middlewareFor('/forgot-password', { access_token: liveJwt })).kind, 'next');
    assert.equal((await middlewareFor('/reset-password', { access_token: liveJwt })).kind, 'next');
  });

  test('regressão: rotas privadas continuam exigindo login', async () => {
    const res = await middlewareFor('/clientes');
    assert.equal(res.kind, 'redirect');
    assert.match(res.location, /\/login$/);
  });

  test('regressão: /login com sessão continua redirecionando para /dashboard', async () => {
    const res = await middlewareFor('/login', { access_token: liveJwt });
    assert.equal(res.kind, 'redirect');
    assert.match(res.location, /\/dashboard$/);
  });
});

describe('AC1/AC2/AC4 — fluxo completo de reset de senha', () => {
  test('esqueci → e-mail com link → /reset-password?token= → nova senha → login com a nova senha', async () => {
    // 1. Tela "Esqueci minha senha" envia o e-mail
    const res1 = await forgot(post({ email: 'tecnico@exemplo.com.br' }));
    assert.equal(res1.status, 200);
    assert.deepEqual(await res1.json(), { ok: true });

    // 2. O backend enviou o e-mail com o link para /reset-password?token=...
    assert.equal(ctx.mails.length, 1);
    const link = ctx.mails[0].html.match(/href="([^"]+)"/)[1];
    const token = new URL(link).searchParams.get('token');
    assert.ok(UUID_RE.test(token), 'token do link deve ser UUID (o formato que a página aceita)');
    assert.equal((await middlewareFor(new URL(link).pathname)).kind, 'next'); // página abre sem sessão

    // 3. A página lê o token da URL e envia a nova senha
    const res2 = await reset(post({ token, new_password: 'nova-senha-123' }));
    assert.equal(res2.status, 200);
    assert.deepEqual(await res2.json(), { ok: true });
    assert.equal(ctx.users.get('tecnico@exemplo.com.br').password, 'nova-senha-123');

    // 4. O mesmo link não funciona uma segunda vez → feedback de token inválido/expirado
    const res3 = await reset(post({ token, new_password: 'outra-senha-456' }));
    assert.equal(res3.status, 400);
    const body3 = await res3.json();
    assert.equal(body3.code, 'INVALID_TOKEN');
    assert.equal(ctx.users.get('tecnico@exemplo.com.br').password, 'nova-senha-123');
  });

  test('e-mail desconhecido recebe a mesma resposta e nenhum e-mail é enviado', async () => {
    const before = ctx.mails.length;
    const res = await forgot(post({ email: 'ninguem@exemplo.com.br' }));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.equal(ctx.mails.length, before);
  });

  test('e-mail malformado devolve 400 com mensagem', async () => {
    const res = await forgot(post({ email: 'nao-e-email' }));
    assert.equal(res.status, 400);
    assert.match((await res.json()).message, /e-mail válido/);
  });

  test('token inexistente (UUID válido) → INVALID_TOKEN', async () => {
    const res = await reset(post({ token: randomUUID(), new_password: 'nova-senha-123' }));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).code, 'INVALID_TOKEN');
  });

  test('senha curta → VALIDATION (não é tratado como token inválido)', async () => {
    const res = await reset(post({ token: randomUUID(), new_password: 'curta' }));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).code, 'VALIDATION');
  });
});

describe('AC3 — /convite/[token]: válido, expirado e já aceito', () => {
  const seed = (token, patch = {}) => ctx.invites.set(token, { email: 'novo@exemplo.com.br', status: 'PENDING', ...patch });

  test('convite válido, anônimo, com nome e senha → ok (precisa entrar em seguida)', async () => {
    seed('tok-valido');
    const res = await convite(post({ name: 'Novo Técnico', password: 'senha-12345' }), inviteCtx('tok-valido'));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, authenticated: false, companyName: 'Elétrica Silva' });
  });

  test('convite válido com usuário logado encaminha o Bearer e marca authenticated', async () => {
    seed('tok-logado');
    globalThis.__testCookies = { access_token: 'sessao-valida' };
    try {
      const res = await convite(post({}), inviteCtx('tok-logado'));
      assert.equal(res.status, 200);
      assert.equal((await res.json()).authenticated, true);
      assert.equal(ctx.accepts.at(-1).auth, 'Bearer sessao-valida');
    } finally {
      delete globalThis.__testCookies;
    }
  });

  test('o mesmo convite aceito de novo → ALREADY_USED', async () => {
    const res = await convite(post({ name: 'Novo Técnico', password: 'senha-12345' }), inviteCtx('tok-valido'));
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code, 'ALREADY_USED');
    assert.match(body.message, /já foi aceito/);
  });

  test('convite expirado → EXPIRED', async () => {
    seed('tok-expirado', { expired: true });
    const res = await convite(post({ name: 'Novo', password: 'senha-12345' }), inviteCtx('tok-expirado'));
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code, 'EXPIRED');
    assert.match(body.message, /expirou/);
  });

  test('token inexistente → NOT_FOUND', async () => {
    const res = await convite(post({ name: 'Novo', password: 'senha-12345' }), inviteCtx('nao-existe'));
    assert.equal(res.status, 404);
    assert.equal((await res.json()).code, 'NOT_FOUND');
  });

  test('anônimo sem nome/senha → NEEDS_ACCOUNT (a página mantém o formulário)', async () => {
    seed('tok-sem-dados');
    const res = await convite(post({}), inviteCtx('tok-sem-dados'));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).code, 'NEEDS_ACCOUNT');
  });

  test('convite para e-mail que já tem conta, sem sessão → ACCOUNT_EXISTS com orientação de login', async () => {
    seed('tok-conta-existente', { email: 'tecnico@exemplo.com.br' });
    const res = await convite(post({ name: 'Técnico', password: 'senha-12345' }), inviteCtx('tok-conta-existente'));
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.code, 'ACCOUNT_EXISTS');
    assert.match(body.message, /entre nela/);
  });

  test('sessão expirada (401) → tenta de novo como anônimo em vez de falhar', async () => {
    seed('tok-sessao-expirada');
    globalThis.__testCookies = { access_token: 'expired-session' };
    try {
      const res = await convite(post({ name: 'Novo', password: 'senha-12345' }), inviteCtx('tok-sessao-expirada'));
      assert.equal(res.status, 200);
      assert.equal((await res.json()).authenticated, false);
    } finally {
      delete globalThis.__testCookies;
    }
  });
});
