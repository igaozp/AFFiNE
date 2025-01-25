import type { INestApplication } from '@nestjs/common';
import type { TestFn } from 'ava';
import ava from 'ava';
import Sinon from 'sinon';

import { AppModule } from '../app.module';
import { MailService } from '../base/mailer';
import { FeatureManagementService } from '../core/features';
import { createTestingApp, createWorkspace, inviteUser, signUp } from './utils';
const test = ava as TestFn<{
  app: INestApplication;
  mail: MailService;
}>;
import * as renderers from '../mails';

test.beforeEach(async t => {
  const { module, app } = await createTestingApp({
    imports: [AppModule],
    tapModule: module => {
      module.overrideProvider(FeatureManagementService).useValue({
        hasWorkspaceFeature() {
          return false;
        },
      });
    },
  });

  const mail = module.get(MailService);
  t.context.app = app;
  t.context.mail = mail;
});

test.afterEach.always(async t => {
  await t.context.app.close();
});

test('should send invite email', async t => {
  const { mail, app } = t.context;

  if (mail.hasConfigured()) {
    const u1 = await signUp(app, 'u1', 'u1@affine.pro', '1');
    const u2 = await signUp(app, 'u2', 'u2@affine.pro', '1');

    const workspace = await createWorkspace(app, u1.token.token);

    const stub = Sinon.stub(mail, 'send');

    await inviteUser(app, u1.token.token, workspace.id, u2.email, true);

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
