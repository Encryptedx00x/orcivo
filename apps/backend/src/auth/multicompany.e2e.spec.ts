import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanupDatabase, getTestApp } from '../../test/setup';
import { createTenant } from '../../test/tenant-factory';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

jest.setTimeout(60_000);

describe('B4-38 — sessões e isolamento multiempresa', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    await cleanupDatabase();
    app = await getTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await cleanupDatabase();
    if (app) await app.close();
  });

  it('vincula o mesmo usuário a A e B com sessões independentes e isolamento A/B', async () => {
    const owner = await createTenant(app, 'multi');
    const server = app.getHttpServer();

    const companyB = await request(server)
      .post('/companies')
      .set(auth(owner.token))
      .send({ trade_name: 'Empresa B' })
      .expect(201);

    const listed = await request(server).get('/companies').set(auth(owner.token)).expect(200);
    expect(listed.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ company_id: owner.companyId, active: true, role: 'OWNER' }),
        expect.objectContaining({ company_id: companyB.body.id, active: false, role: 'OWNER' }),
      ]),
    );

    const login = await request(server)
      .post('/auth/login')
      .send({ email: owner.email, password: owner.password })
      .expect(200);
    expect(login.body.requires_company_selection).toBe(true);
    expect(login.body.access_token).toBeUndefined();
    expect(login.body.companies).toHaveLength(2);

    const selectedA = await request(server)
      .post('/auth/select-company')
      .send({ selection_token: login.body.selection_token, company_id: owner.companyId })
      .expect(200);
    const selectedB = await request(server)
      .post('/auth/select-company')
      .send({ selection_token: login.body.selection_token, company_id: companyB.body.id })
      .expect(200);

    const customerA = await request(server)
      .post('/customers')
      .set(auth(selectedA.body.access_token))
      .send({ name: 'Cliente exclusivo A' })
      .expect(201);
    const customerB = await request(server)
      .post('/customers')
      .set(auth(selectedB.body.access_token))
      .send({ name: 'Cliente exclusivo B' })
      .expect(201);

    const listA = await request(server)
      .get('/customers')
      .set(auth(selectedA.body.access_token))
      .expect(200);
    const listB = await request(server)
      .get('/customers')
      .set(auth(selectedB.body.access_token))
      .expect(200);
    expect(listA.body.data.map((item: { id: string }) => item.id)).toEqual([customerA.body.id]);
    expect(listB.body.data.map((item: { id: string }) => item.id)).toEqual([customerB.body.id]);

    const refreshedB = await request(server)
      .post('/auth/refresh')
      .send({ refresh_token: selectedB.body.refresh_token })
      .expect(200);
    const currentB = await request(server)
      .get('/company/me')
      .set(auth(refreshedB.body.access_token))
      .expect(200);
    expect(currentB.body.id).toBe(companyB.body.id);

    const parallelA = await request(server)
      .post('/auth/select-company')
      .send({ selection_token: login.body.selection_token, company_id: owner.companyId })
      .expect(200);
    const switched = await request(server)
      .post('/auth/switch-company')
      .set(auth(selectedA.body.access_token))
      .send({ company_id: companyB.body.id, refresh_token: selectedA.body.refresh_token })
      .expect(200);
    expect(switched.body.company.id).toBe(companyB.body.id);

    await request(server).get('/company/me').set(auth(selectedA.body.access_token)).expect(401);
    const stillA = await request(server)
      .get('/company/me')
      .set(auth(parallelA.body.access_token))
      .expect(200);
    expect(stillA.body.id).toBe(owner.companyId);

    const switchAudit = await prisma.auditLog.findFirst({
      where: { company_id: companyB.body.id, action: 'auth.company_switched' },
    });
    expect(switchAudit).toBeTruthy();
  });

  it('aceita convite de conta existente sem recadastro nem troca silenciosa', async () => {
    const invited = await createTenant(app, 'existing');
    const inviter = await createTenant(app, 'inviter');
    const server = app.getHttpServer();
    const before = await prisma.user.count({ where: { email: invited.email } });

    const created = await request(server)
      .post('/invites')
      .set(auth(inviter.token))
      .send({ email: invited.email, role: 'TECNICO' })
      .expect(201);

    await request(server)
      .post('/invites/accept')
      .send({ token: created.body.token, name: 'Duplicado', password: 'Senha@Teste123' })
      .expect(409);

    const accepted = await request(server)
      .post('/invites/accept-existing')
      .set(auth(invited.token))
      .send({ token: created.body.token })
      .expect(201);
    expect(accepted.body.company.id).toBe(inviter.companyId);
    expect(await prisma.user.count({ where: { email: invited.email } })).toBe(before);

    const current = await request(server).get('/company/me').set(auth(invited.token)).expect(200);
    expect(current.body.id).toBe(invited.companyId);

    const login = await request(server)
      .post('/auth/login')
      .send({ email: invited.email, password: invited.password })
      .expect(200);
    expect(login.body.companies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ company_id: invited.companyId, role: 'OWNER' }),
        expect.objectContaining({ company_id: inviter.companyId, role: 'TECNICO' }),
      ]),
    );

    const selectedInvitedCompany = await request(server)
      .post('/auth/select-company')
      .send({ selection_token: login.body.selection_token, company_id: inviter.companyId })
      .expect(200);
    await request(server)
      .get('/company/members')
      .set(auth(selectedInvitedCompany.body.access_token))
      .expect(403);

    const secondAccept = await request(server)
      .post('/invites/accept-existing')
      .set(auth(invited.token))
      .send({ token: created.body.token })
      .expect(201);
    expect(secondAccept.body.already_member).toBe(true);
  });

  it('recusa seleção de empresa fora das associações do usuário', async () => {
    const one = await createTenant(app, 'outside-a');
    const other = await createTenant(app, 'outside-b');
    const server = app.getHttpServer();
    const second = await request(server)
      .post('/companies')
      .set(auth(one.token))
      .send({ trade_name: 'Segunda empresa para exigir seleção' })
      .expect(201);
    expect(second.body.id).toBeTruthy();
    const login = await request(server)
      .post('/auth/login')
      .send({ email: one.email, password: one.password })
      .expect(200);

    await request(server)
      .post('/auth/select-company')
      .send({ selection_token: login.body.selection_token, company_id: other.companyId })
      .expect(401);
  });

  it('migra refresh legado apenas quando existe uma única associação ativa', async () => {
    const single = await createTenant(app, 'legacy-single');
    const server = app.getHttpServer();
    const jwt = app.get(JwtService);
    const makeLegacyRefresh = async (userId: string, email: string) => {
      const token = jwt.sign(
        { sub: userId, email, jti: crypto.randomUUID() },
        { secret: process.env['JWT_REFRESH_SECRET']!, expiresIn: '30d' },
      );
      await prisma.refreshToken.create({
        data: {
          user_id: userId,
          session_id: crypto.randomUUID(),
          token_hash: crypto.createHash('sha256').update(token).digest('hex'),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      return token;
    };

    const singleLegacy = await makeLegacyRefresh(single.userId, single.email);
    const upgraded = await request(server)
      .post('/auth/refresh')
      .send({ refresh_token: singleLegacy })
      .expect(200);
    await request(server).get('/company/me').set(auth(upgraded.body.access_token)).expect(200);

    const multi = await createTenant(app, 'legacy-multi');
    await request(server)
      .post('/companies')
      .set(auth(multi.token))
      .send({ trade_name: 'Segunda empresa legada' })
      .expect(201);
    const multiLegacy = await makeLegacyRefresh(multi.userId, multi.email);
    await request(server).post('/auth/refresh').send({ refresh_token: multiLegacy }).expect(401);
  });
});
