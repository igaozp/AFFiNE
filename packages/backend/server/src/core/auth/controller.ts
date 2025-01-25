import { resolveMx, resolveTxt, setServers } from 'node:dns/promises';

import {
  Body,
  Controller,
  Get,
  Header,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import {
  Cache,
  Config,
  CryptoHelper,
  EarlyAccessRequired,
  EmailTokenNotFound,
  InternalServerError,
  InvalidEmail,
  InvalidEmailToken,
  Runtime,
  SignUpForbidden,
  Throttle,
  URLHelper,
  UseNamedGuard,
} from '../../base';
import { Models, TokenType } from '../../models';
import { validators } from '../utils/validators';
import { Public } from './guard';
import { AuthService } from './service';
import { CurrentUser, Session } from './session';

interface PreflightResponse {
  registered: boolean;
  hasPassword: boolean;
  magicLink: boolean;
}

interface SignInCredential {
  email: string;
  password?: string;
  callbackUrl?: string;
}

interface MagicLinkCredential {
  email: string;
  token: string;
}

const OTP_CACHE_KEY = (otp: string) => `magic-link-otp:${otp}`;

@Throttle('strict')
@Controller('/api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly url: URLHelper,
    private readonly auth: AuthService,
    private readonly models: Models,
    private readonly config: Config,
    private readonly runtime: Runtime,
    private readonly cache: Cache,
    private readonly crypto: CryptoHelper
  ) {
    if (config.node.dev) {
      // set DNS servers in dev mode
      // NOTE: some network debugging software uses DNS hijacking
      // to better debug traffic, but their DNS servers may not
      // handle the non dns query(like txt, mx) correctly, so we
      // set a public DNS server here to avoid this issue.
      setServers(['1.1.1.1', '8.8.8.8']);
    }
  }

  @Public()
  @Post('/preflight')
  async preflight(
    @Body() params?: { email: string }
  ): Promise<PreflightResponse> {
    if (!params?.email) {
      throw new InvalidEmail({ email: 'not provided' });
    }
    validators.assertValidEmail(params.email);

    const user = await this.models.user.getUserByEmail(params.email);

    const magicLinkAvailable = !!this.config.mailer.host;

    if (!user) {
      return {
        registered: false,
        hasPassword: false,
        magicLink: magicLinkAvailable,
      };
    }

    return {
      registered: user.registered,
      hasPassword: !!user.password,
      magicLink: magicLinkAvailable,
    };
  }

  @Public()
  @UseNamedGuard('captcha')
  @Post('/sign-in')
  @Header('content-type', 'application/json')
  async signIn(
    @Req() req: Request,
    @Res() res: Response,
    @Body() credential: SignInCredential,
    /**
     * @deprecated
     */
    @Query('redirect_uri') redirectUri?: string
  ) {
    validators.assertValidEmail(credential.email);
    const canSignIn = await this.auth.canSignIn(credential.email);
    if (!canSignIn) {
      throw new EarlyAccessRequired();
    }

    if (credential.password) {
      await this.passwordSignIn(
        req,
        res,
        credential.email,
        credential.password
      );
    } else {
      await this.sendMagicLink(
        req,
        res,
        credential.email,
        credential.callbackUrl,
        redirectUri
      );
    }
  }

  async passwordSignIn(
    req: Request,
    res: Response,
    email: string,
    password: string
  ) {
    const user = await this.auth.signIn(email, password);

    await this.auth.setCookies(req, res, user.id);
    res.status(HttpStatus.OK).send(user);
  }

  async sendMagicLink(
    _req: Request,
    res: Response,
    email: string,
    callbackUrl = '/magic-link',
    redirectUrl?: string
  ) {
    // send email magic link
    const user = await this.models.user.getUserByEmail(email);
    if (!user) {
      const allowSignup = await this.runtime.fetch('auth/allowSignup');
      if (!allowSignup) {
        throw new SignUpForbidden();
      }

      const requireEmailDomainVerification = await this.runtime.fetch(
        'auth/requireEmailDomainVerification'
      );
      if (requireEmailDomainVerification) {
        // verify domain has MX, SPF, DMARC records
        const [name, domain, ...rest] = email.split('@');
        if (rest.length || !domain) {
          throw new InvalidEmail({ email });
        }
        const [mx, spf, dmarc] = await Promise.allSettled([
          resolveMx(domain).then(t => t.map(mx => mx.exchange).filter(Boolean)),
          resolveTxt(domain).then(t =>
            t.map(([k]) => k).filter(txt => txt.includes('v=spf1'))
          ),
          resolveTxt('_dmarc.' + domain).then(t =>
            t.map(([k]) => k).filter(txt => txt.includes('v=DMARC1'))
          ),
        ]).then(t => t.filter(t => t.status === 'fulfilled').map(t => t.value));
        if (!mx?.length || !spf?.length || !dmarc?.length) {
          throw new InvalidEmail({ email });
        }
        // filter out alias emails
        if (name.includes('+')) {
          throw new InvalidEmail({ email });
        }
      }
    }

    const ttlInSec = 30 * 60;
    const token = await this.models.verificationToken.create(
      TokenType.SignIn,
      email,
      ttlInSec
    );

    const otp = this.crypto.otp();
    // TODO(@forehalo): this is a temporary solution, we should not rely on cache to store the otp
    const cacheKey = OTP_CACHE_KEY(otp);
    await this.cache.set(cacheKey, token, { ttl: ttlInSec * 1000 });

    const magicLink = this.url.link(callbackUrl, {
      token: otp,
      email,
      ...(redirectUrl
        ? {
            redirect_uri: redirectUrl,
          }
        : {}),
    });
    if (this.config.node.dev) {
      // make it easier to test in dev mode
      this.logger.debug(`Magic link: ${magicLink}`);
    }

    const result = await this.auth.sendSignInEmail(
      email,
      magicLink,
      otp,
      !user
    );

    if (result.rejected.length) {
      throw new InternalServerError('Failed to send sign-in email.');
    }

    res.status(HttpStatus.OK).send({
      email: email,
    });
  }

  @Public()
  @Get('/sign-out')
  async signOut(
    @Res() res: Response,
    @Session() session: Session | undefined,
    @Query('user_id') userId: string | undefined
  ) {
    if (!session) {
      res.status(HttpStatus.OK).send({});
      return;
    }

    await this.auth.signOut(session.sessionId, userId);
    await this.auth.refreshCookies(res, session.sessionId);

    res.status(HttpStatus.OK).send({});
  }

  @Public()
  @Post('/magic-link')
  async magicLinkSignIn(
    @Req() req: Request,
    @Res() res: Response,
    @Body() { email, token }: MagicLinkCredential
  ) {
    if (!token || !email) {
      throw new EmailTokenNotFound();
    }

    validators.assertValidEmail(email);

    const cacheKey = OTP_CACHE_KEY(token);
    const cachedToken = await this.cache.get<string>(cacheKey);

    if (!cachedToken) {
      throw new InvalidEmailToken();
    }

    const tokenRecord = await this.models.verificationToken.verify(
      TokenType.SignIn,
      cachedToken,
      {
        credential: email,
      }
    );

    if (!tokenRecord) {
      throw new InvalidEmailToken();
    }

    const user = await this.models.user.fulfill(email);

    await this.auth.setCookies(req, res, user.id);
    res.send({ id: user.id });
  }

  @Throttle('default', { limit: 1200 })
  @Public()
  @Get('/session')
  async currentSessionUser(@CurrentUser() user?: CurrentUser) {
    return {
      user,
    };
  }

  @Throttle('default', { limit: 1200 })
  @Public()
  @Get('/sessions')
  async currentSessionUsers(@Req() req: Request) {
    const token = req.cookies[AuthService.sessionCookieName];
    if (!token) {
      return {
        users: [],
      };
    }

    return {
      users: await this.auth.getUserList(token),
    };
  }
}
