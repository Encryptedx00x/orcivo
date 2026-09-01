import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export interface TestTenant {
  token: string;
  userId: string;
  companyId: string;
  email: string;
  password: string;
}

const PASSWORD = 'Senha@Teste123';
let seq = 0;

/**
 * Full signup (user + company + login) for an isolated test tenant.
 * The signup user is the company OWNER. Emails are unique per call.
 */
export async function createTenant(app: INestApplication, label = 't'): Promise<TestTenant> {
  const n = ++seq;
  const server = app.getHttpServer();
  const email = `${label}${n}.${Date.now()}@isolation.test`;

  const signup = await request(server)
    .post('/auth/signup/user')
    .send({
      name: `Tenant ${label}${n}`,
      email,
      phone: `1190${String(1_000_000 + n).slice(-7)}`,
      password: PASSWORD,
      accepted_terms: true,
    });
  if (!signup.body.access_token) {
    throw new Error(`signup/user failed (${signup.status}): ${JSON.stringify(signup.body)}`);
  }

  const company = await request(server)
    .post('/auth/signup/company')
    .set('Authorization', `Bearer ${signup.body.access_token}`)
    .send({ trade_name: `Empresa ${label}${n}`, document_type: 'CNPJ' });
  if (!company.body.company?.id) {
    throw new Error(`signup/company failed (${company.status}): ${JSON.stringify(company.body)}`);
  }

  const login = await request(server).post('/auth/login').send({ email, password: PASSWORD });
  return {
    token: login.body.access_token,
    userId: login.body.user.id,
    companyId: login.body.company.id,
    email,
    password: PASSWORD,
  };
}

/**
 * Invite a new member with the given role into `owner`'s company, accept the
 * invite (creating the user), and return their login token.
 */
export async function addMember(
  app: INestApplication,
  ownerToken: string,
  role: 'ADMIN' | 'TECNICO',
): Promise<TestTenant> {
  const n = ++seq;
  const server = app.getHttpServer();
  const email = `member${n}.${Date.now()}@isolation.test`;

  const invite = await request(server)
    .post('/invites')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ email, role });
  if (!invite.body.token) {
    throw new Error(`invite create failed (${invite.status}): ${JSON.stringify(invite.body)}`);
  }

  const accept = await request(server)
    .post('/invites/accept')
    .send({ token: invite.body.token, name: `Member ${role} ${n}`, password: PASSWORD });
  if (accept.status >= 300) {
    throw new Error(`invite accept failed (${accept.status}): ${JSON.stringify(accept.body)}`);
  }

  const login = await request(server).post('/auth/login').send({ email, password: PASSWORD });
  return {
    token: login.body.access_token,
    userId: login.body.user.id,
    companyId: login.body.company.id,
    email,
    password: PASSWORD,
  };
}

/** Create a customer in the given tenant, return its id. */
export async function createCustomer(
  app: INestApplication,
  token: string,
  name = 'Cliente',
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/customers')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, phone: '11999990000' });
  if (!res.body.id)
    throw new Error(`createCustomer failed (${res.status}): ${JSON.stringify(res.body)}`);
  return res.body.id;
}
