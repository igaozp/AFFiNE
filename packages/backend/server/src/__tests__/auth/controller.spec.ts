import { HttpStatus } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import ava, { TestFn } from 'ava';
import Sinon from 'sinon';

import { MailService } from '../../base';
import { AuthModule } from '../../core/auth';
import { AuthService } from '../../core/auth/service';
import { FeatureModule } from '../../core/features';
import { UserModule } from '../../core/user';
import {
  createTestingApp,
  currentUser,
  parseCookies,
  TestingApp,
} from '../utils';

const test = ava as TestFn<{
  auth: AuthService;
  db: PrismaClient;
  mailer: Sinon.SinonStubbedInstance<MailService>;
  app: TestingApp;
}>;

test.before(async t => {
  const app = await createTestingApp({
    imports: [FeatureModule, UserModule, AuthModule],
    tapModule: m => {
      m.overrideProvider(MailService).useValue(
        Sinon.stub(
          // @ts-expect-error safe
          new MailService()
        )
      );
    },
  });

  t.context.auth = app.get(AuthService);
  t.context.db = app.get(PrismaClient);
  t.context.mailer = app.get(MailService);
  t.context.app = app;
});

test.beforeEach(async t => {
  Sinon.reset();
  await t.context.app.initTestingDB();
});

test.after.always(async t => {
  await t.context.app.close();
});

test('should be able to sign in with credential', async t => {
  const { app } = t.context;

  const u1 = await app.createUser('u1@affine.pro');

  await app
    .POST('/api/auth/sign-in')
    .send({ email: u1.email, password: u1.password })
    .expect(200);

  const session = await currentUser(app);
  t.is(session?.id, u1.id);
});

test('should be able to sign in with email', async t => {
  const { app, mailer } = t.context;

  const u1 = await app.createUser('u1@affine.pro');
  // @ts-expect-error mock
  mailer.sendSignInMail.resolves({ rejected: [] });

  const res = await app
    .POST('/api/auth/sign-in')
    .send({ email: u1.email })
    .expect(200);

  t.is(res.body.email, u1.email);
  t.true(mailer.sendSignInMail.calledOnce);

  const [, { url: signInLink }] = mailer.sendSignInMail.firstCall.args;
  const url = new URL(signInLink);
  const email = url.searchParams.get('email');
  const token = url.searchParams.get('token');

  await app.POST('/api/auth/magic-link').send({ email, token }).expect(201);

  const session = await currentUser(app);
  t.is(session?.id, u1.id);
});

test('should be able to sign up with email', async t => {
  const { app, mailer } = t.context;

  // @ts-expect-error mock
  mailer.sendSignUpMail.resolves({ rejected: [] });

  const res = await app
    .POST('/api/auth/sign-in')
    .send({ email: 'u2@affine.pro' })
    .expect(200);

  t.is(res.body.email, 'u2@affine.pro');
  t.true(mailer.sendSignUpMail.calledOnce);

  const [, { url: signUpLink }] = mailer.sendSignUpMail.firstCall.args;
  const url = new URL(signUpLink);
  const email = url.searchParams.get('email');
  const token = url.searchParams.get('token');

  await app.POST('/api/auth/magic-link').send({ email, token }).expect(201);

  const session = await currentUser(app);
  t.is(session?.email, 'u2@affine.pro');
});

test('should not be able to sign in if email is invalid', async t => {
  const { app } = t.context;

  const res = await app
    .POST('/api/auth/sign-in')
    .send({ email: '' })
    .expect(400);

  t.is(res.body.message, 'An invalid email provided: ');
});

test('should not be able to sign in if forbidden', async t => {
  const { app, auth, mailer } = t.context;

  const u1 = await app.createUser('u1@affine.pro');
  const canSignInStub = Sinon.stub(auth, 'canSignIn').resolves(false);

  await app
    .POST('/api/auth/sign-in')
    .send({ email: u1.email })
    .expect(HttpStatus.FORBIDDEN);

  t.true(mailer.sendSignInMail.notCalled);

  canSignInStub.restore();
});

test('should be able to sign out', async t => {
  const { app } = t.context;

  const u1 = await app.createUser('u1@affine.pro');

  await app
    .POST('/api/auth/sign-in')
    .send({ email: u1.email, password: u1.password })
    .expect(200);

  await app.GET('/api/auth/sign-out').expect(200);

  const session = await currentUser(app);

  t.falsy(session);
});

test('should be able to correct user id cookie', async t => {
  const { app } = t.context;

  const u1 = await app.signup('u1@affine.pro');

  const req = app.GET('/api/auth/session');
  let cookies = req.get('cookie') as unknown as string[];
  cookies = cookies.filter(c => !c.startsWith(AuthService.userCookieName));
  cookies.push(`${AuthService.userCookieName}=invalid_user_id`);
  const res = await req.set('Cookie', cookies).expect(200);
  const setCookies = parseCookies(res);
  const userIdCookie = setCookies[AuthService.userCookieName];

  t.is(userIdCookie, u1.id);
});

// multiple accounts session tests
test('should be able to sign in another account in one session', async t => {
  const { app } = t.context;

  const u1 = await app.createUser('u1@affine.pro');
  const u2 = await app.createUser('u2@affine.pro');

  // sign in u1
  const res = await app
    .POST('/api/auth/sign-in')
    .send({ email: u1.email, password: u1.password })
    .expect(200);

  const cookies = parseCookies(res);

  // sign in u2 in the same session
  await app
    .POST('/api/auth/sign-in')
    .send({ email: u2.email, password: u2.password })
    .expect(200);

  // list [u1, u2]
  const sessions = await app.GET('/api/auth/sessions').expect(200);

  t.is(sessions.body.users.length, 2);
  t.like(
    sessions.body.users.map((u: any) => u.id),
    [u1.id, u2.id]
  );

  // default to latest signed in user: u2
  let session = await app.GET('/api/auth/session').expect(200);

  t.is(session.body.user.id, u2.id);

  // switch to u1
  session = await app
    .GET('/api/auth/session')
    .set(
      'Cookie',
      Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ')
    )
    .expect(200);

  t.is(session.body.user.id, u1.id);
});

test('should be able to sign out multiple accounts in one session', async t => {
  const { app } = t.context;

  const u1 = await app.signup('u1@affine.pro');
  const u2 = await app.signup('u2@affine.pro');

  // sign out u2
  await app.GET(`/api/auth/sign-out?user_id=${u2.id}`).expect(200);

  // list [u1]
  let session = await app.GET('/api/auth/session').expect(200);
  t.is(session.body.user.id, u1.id);

  // sign in u2 in the same session
  await app
    .POST('/api/auth/sign-in')
    .send({ email: u2.email, password: u2.password })
    .expect(200);

  // sign out all account in session
  await app.GET('/api/auth/sign-out').expect(200);

  session = await app.GET('/api/auth/session').expect(200);
  t.falsy(session.body.user);
});
