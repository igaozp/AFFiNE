import type { TestFn } from 'ava';
import ava from 'ava';
import Sinon from 'sinon';

import { MailService } from '../base/mailer';
import {
  createTestingApp,
  createWorkspace,
  inviteUser,
  TestingApp,
} from './utils';
const test = ava as TestFn<{
  app: TestingApp;
  mail: MailService;
}>;
import * as renderers from '../mails';

test.beforeEach(async t => {
  const app = await createTestingApp();

  const mail = app.get(MailService);
  t.context.app = app;
  t.context.mail = mail;
});

test.afterEach.always(async t => {
  await t.context.app.close();
});

test('should send invite email', async t => {
  const { mail, app } = t.context;

  if (mail.hasConfigured()) {
    const u2 = await app.signup('u2@affine.pro');
    const u1 = await app.signup('u1@affine.pro');
    const stub = Sinon.stub(mail, 'send');

    const workspace = await createWorkspace(app);
    await inviteUser(app, workspace.id, u2.email, true);

    t.true(stub.calledOnce);

    const args = stub.args[0][0];

    t.is(args.to, u2.email);
    t.true(
      args.subject!.startsWith(
        `${u1.email} invited you to join` /* we don't know the name of mocked workspace */
      )
    );
  }
  t.pass();
});

test('should render emails', async t => {
  for (const render of Object.values(renderers)) {
    // @ts-expect-error use [PreviewProps]
    const content = await render();
    t.snapshot(content.html, content.subject);
  }
});
