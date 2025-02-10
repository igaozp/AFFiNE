import { randomBytes } from 'node:crypto';

import {
  getCurrentMailMessageCount,
  getTokenFromLatestMailMessage,
} from '@affine-test/kit/utils/cloud';
import type { TestFn } from 'ava';
import ava from 'ava';

import { MailService } from '../../base/mailer';
import {
  changeEmail,
  changePassword,
  createTestingApp,
  currentUser,
  sendChangeEmail,
  sendSetPasswordEmail,
  sendVerifyChangeEmail,
  TestingApp,
} from '../utils';

const test = ava as TestFn<{
  app: TestingApp;
  mail: MailService;
}>;

test.beforeEach(async t => {
  const app = await createTestingApp();
  const mail = app.get(MailService);
  t.context.app = app;
  t.context.mail = mail;
});

test.afterEach.always(async t => {
  await t.context.app.close();
});

test('change email', async t => {
  const { mail, app } = t.context;
  if (mail.hasConfigured()) {
    const u1Email = 'u1@affine.pro';
    const u2Email = 'u2@affine.pro';

    await app.signup(u1Email);
    const primitiveMailCount = await getCurrentMailMessageCount();
    await sendChangeEmail(app, u1Email, 'affine.pro');

    const afterSendChangeMailCount = await getCurrentMailMessageCount();
    t.is(
      primitiveMailCount + 1,
      afterSendChangeMailCount,
      'failed to send change email'
    );

    const changeEmailToken = await getTokenFromLatestMailMessage();

    t.not(
      changeEmailToken,
      null,
      'fail to get change email token from email content'
    );

    await sendVerifyChangeEmail(
      app,
      changeEmailToken as string,
      u2Email,
      'affine.pro'
    );

    const afterSendVerifyMailCount = await getCurrentMailMessageCount();

    t.is(
      afterSendChangeMailCount + 1,
      afterSendVerifyMailCount,
      'failed to send verify email'
    );

    const verifyEmailToken = await getTokenFromLatestMailMessage();

    t.not(
      verifyEmailToken,
      null,
      'fail to get verify change email token from email content'
    );

    await changeEmail(app, verifyEmailToken as string, u2Email);

    const afterNotificationMailCount = await getCurrentMailMessageCount();

    t.is(
      afterSendVerifyMailCount + 1,
      afterNotificationMailCount,
      'failed to send notification email'
    );
  }
  t.pass();
});

test('set and change password', async t => {
  const { mail, app } = t.context;
  if (mail.hasConfigured()) {
    const u1Email = 'u1@affine.pro';

    const u1 = await app.signup(u1Email);

    const primitiveMailCount = await getCurrentMailMessageCount();

    await sendSetPasswordEmail(app, u1Email, 'affine.pro');

    const afterSendSetMailCount = await getCurrentMailMessageCount();

    t.is(
      primitiveMailCount + 1,
      afterSendSetMailCount,
      'failed to send set email'
    );

    const setPasswordToken = await getTokenFromLatestMailMessage();

    t.not(
      setPasswordToken,
      null,
      'fail to get set password token from email content'
    );

    const newPassword = randomBytes(16).toString('hex');
    const success = await changePassword(
      app,
      u1.id,
      setPasswordToken as string,
      newPassword
    );

    t.true(success, 'failed to change password');

    await app.login({
      ...u1,
      password: newPassword,
    });

    const user = await currentUser(app);

    t.not(user, null, 'failed to get current user');
    t.is(user?.email, u1Email, 'failed to get current user');
  }
  t.pass();
});
test('should revoke token after change user identify', async t => {
  const { mail, app } = t.context;
  if (mail.hasConfigured()) {
    // change email
    {
      const u1Email = 'u1@affine.pro';
      const u2Email = 'u2@affine.pro';

      const u1 = await app.signup(u1Email);

      {
        const user = await currentUser(app);
        t.is(user?.email, u1Email, 'failed to get current user');
      }

      await sendChangeEmail(app, u1Email, 'affine.pro');

      const changeEmailToken = await getTokenFromLatestMailMessage();
      await sendVerifyChangeEmail(
        app,
        changeEmailToken as string,
        u2Email,
        'affine.pro'
      );

      const verifyEmailToken = await getTokenFromLatestMailMessage();
      await changeEmail(app, verifyEmailToken as string, u2Email);

      let user = await currentUser(app);
      t.is(user, null, 'token should be revoked');

      await app.login({
        ...u1,
        email: u2Email,
      });

      user = await currentUser(app);
      t.is(user?.email, u2Email, 'failed to sign in with new email');
    }

    // change password
    {
      const u3Email = 'u3333@affine.pro';

      await app.logout();
      const u3 = await app.signup(u3Email);

      {
        const user = await currentUser(app);
        t.is(user?.email, u3Email, 'failed to get current user');
      }

      await sendSetPasswordEmail(app, u3Email, 'affine.pro');
      const token = await getTokenFromLatestMailMessage();
      const newPassword = randomBytes(16).toString('hex');
      await changePassword(app, u3.id, token as string, newPassword);

      let user = await currentUser(app);
      t.is(user, null, 'token should be revoked');

      await app.login({
        ...u3,
        password: newPassword,
      });
      user = await currentUser(app);
      t.is(user?.email, u3Email, 'failed to sign in with new password');
    }
  }
  t.pass();
});
