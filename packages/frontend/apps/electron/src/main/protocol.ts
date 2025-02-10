import { join } from 'node:path';

import { net, protocol, session } from 'electron';
import cookieParser from 'set-cookie-parser';

import { logger } from './logger';
import { isOfflineModeEnabled } from './utils';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'assets',
    privileges: {
      secure: false,
      corsEnabled: true,
      supportFetchAPI: true,
      standard: true,
      bypassCSP: true,
    },
  },
]);

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'file',
    privileges: {
      secure: false,
      corsEnabled: true,
      supportFetchAPI: true,
      standard: true,
      bypassCSP: true,
      stream: true,
    },
  },
]);

const NETWORK_REQUESTS = ['/api', '/ws', '/socket.io', '/graphql'];
const webStaticDir = join(__dirname, '../resources/web-static');

function isNetworkResource(pathname: string) {
  return NETWORK_REQUESTS.some(opt => pathname.startsWith(opt));
}

async function handleFileRequest(request: Request) {
  const urlObject = new URL(request.url);

  // Redirect to webpack dev server if defined
  if (process.env.DEV_SERVER_URL) {
    const devServerUrl = new URL(
      urlObject.pathname,
      process.env.DEV_SERVER_URL
    );
    return net.fetch(devServerUrl.toString(), request);
  }
  const clonedRequest = Object.assign(request.clone(), {
    bypassCustomProtocolHandlers: true,
  });
  // this will be file types (in the web-static folder)
  let filepath = '';
  // if is a file type, load the file in resources
  if (urlObject.pathname.split('/').at(-1)?.includes('.')) {
    // Sanitize pathname to prevent path traversal attacks
    const decodedPath = decodeURIComponent(urlObject.pathname);
    const normalizedPath = join(webStaticDir, decodedPath).normalize();
    if (!normalizedPath.startsWith(webStaticDir)) {
      // Attempted path traversal - reject by using empty path
      filepath = join(webStaticDir, '');
    } else {
      filepath = normalizedPath;
    }
  } else {
    // else, fallback to load the index.html instead
    filepath = join(webStaticDir, 'index.html');
  }
  return net.fetch('file://' + filepath, clonedRequest);
}

export function registerProtocol() {
  protocol.handle('file', request => {
    return handleFileRequest(request);
  });

  protocol.handle('assets', request => {
    return handleFileRequest(request);
  });

  session.defaultSession.webRequest.onHeadersReceived(
    (responseDetails, callback) => {
      const { responseHeaders } = responseDetails;
      (async () => {
        if (responseHeaders) {
          const originalCookie =
            responseHeaders['set-cookie'] || responseHeaders['Set-Cookie'];

          if (originalCookie) {
            // save the cookies, to support third party cookies
            for (const cookies of originalCookie) {
              const parsedCookies = cookieParser.parse(cookies);
              for (const parsedCookie of parsedCookies) {
                if (!parsedCookie.value) {
                  await session.defaultSession.cookies.remove(
                    responseDetails.url,
                    parsedCookie.name
                  );
                } else {
                  await session.defaultSession.cookies.set({
                    url: responseDetails.url,
                    domain: parsedCookie.domain,
                    expirationDate: parsedCookie.expires?.getTime(),
                    httpOnly: parsedCookie.httpOnly,
                    secure: parsedCookie.secure,
                    value: parsedCookie.value,
                    name: parsedCookie.name,
                    path: parsedCookie.path,
                    sameSite: parsedCookie.sameSite?.toLowerCase() as
                      | 'unspecified'
                      | 'no_restriction'
                      | 'lax'
                      | 'strict'
                      | undefined,
                  });
                }
              }
            }
          }

          delete responseHeaders['access-control-allow-origin'];
          delete responseHeaders['access-control-allow-headers'];
          responseHeaders['Access-Control-Allow-Origin'] = ['*'];
          responseHeaders['Access-Control-Allow-Headers'] = ['*'];
        }
      })()
        .catch(err => {
          logger.error('error handling headers received', err);
        })
        .finally(() => {
          callback({ responseHeaders });
        });
    }
  );

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const url = new URL(details.url);
    const pathname = url.pathname;
    const protocol = url.protocol;
    const origin = url.origin;

    // offline whitelist
    // 1. do not block non-api request for http://localhost || file:// (local dev assets)
    // 2. do not block devtools
    // 3. block all other requests
    const blocked = (() => {
      if (!isOfflineModeEnabled()) {
        return false;
      }
      if (
        (protocol === 'file:' || origin.startsWith('http://localhost')) &&
        !isNetworkResource(pathname)
      ) {
        return false;
      }
      if ('devtools:' === protocol) {
        return false;
      }
      return true;
    })();

    if (blocked) {
      logger.debug('blocked request', details.url);
      callback({
        cancel: true,
      });
      return;
    }

    (async () => {
      // session cookies are set to file:// on production
      // if sending request to the cloud, attach the session cookie (to affine cloud server)
      if (
        url.protocol === 'http:' ||
        url.protocol === 'https:' ||
        url.protocol === 'ws:' ||
        url.protocol === 'wss:'
      ) {
        const cookies = await session.defaultSession.cookies.get({
          url: details.url,
        });

        const cookieString = cookies
          .map(c => `${c.name}=${c.value}`)
          .join('; ');
        delete details.requestHeaders['cookie'];
        details.requestHeaders['Cookie'] = cookieString;

        // mitigate the issue of the worker not being able to access the origin
        if (isNetworkResource(pathname)) {
          details.requestHeaders['origin'] = url.origin;
          details.requestHeaders['referer'] = url.origin;
        }
      }
    })()
      .catch(err => {
        logger.error('error handling before send headers', err);
      })
      .finally(() => {
        callback({
          cancel: false,
          requestHeaders: details.requestHeaders,
        });
      });
  });
}
