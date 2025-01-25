import '@affine/core/bootstrap/browser';

/**
 * the below code includes the custom fetch and websocket implementation for ios webview.
 * should be included in the entry file of the app or webworker.
 */

/*
 * we override the browser's fetch function with our custom fetch function to
 * overcome the restrictions of cross-domain and third-party cookies in ios webview.
 *
 * the custom fetch function will convert the request to `affine-http://` or `affine-https://`
 * and send the request to the server.
 */
const rawFetch = globalThis.fetch;
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  let url = new URL(
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url,
    globalThis.location.origin
  ).href;

  if (url.startsWith('capacitor:')) {
    return rawFetch(input, init);
  }

  if (url.startsWith('http:')) {
    url = 'affine-http:' + url.slice(5);
  }

  if (url.startsWith('https:')) {
    url = 'affine-https:' + url.slice(6);
  }

  return rawFetch(url, input instanceof Request ? input : init);
};

/**
 * we create a custom websocket class to simulate the browser's websocket connection
 * through the custom url scheme handler.
 *
 * to overcome the restrictions of cross-domain and third-party cookies in ios webview,
 * the front-end opens a websocket connection and sends a message by sending a request
 * to `affine-ws://` or `affine-wss://`.
 *
 * the scheme has two endpoints:
 *
 * `affine-ws:///open?uuid={uuid}&url={wsUrl}`: opens a websocket connection and returns
 * the received data via the SSE protocol.
 * If the front-end closes the http connection, the websocket connection will also be closed.
 *
 * `affine-ws:///send?uuid={uuid}`: sends the request body data to the websocket connection
 * with the specified uuid.
 */
class WrappedWebSocket {
  static CLOSED = WebSocket.CLOSED;
  static CLOSING = WebSocket.CLOSING;
  static CONNECTING = WebSocket.CONNECTING;
  static OPEN = WebSocket.OPEN;
  readonly isWss: boolean;
  readonly uuid = crypto.randomUUID();
  readyState: number = WebSocket.CONNECTING;
  events: Record<string, ((event: any) => void)[]> = {};
  onopen: ((event: any) => void) | undefined = undefined;
  onclose: ((event: any) => void) | undefined = undefined;
  onerror: ((event: any) => void) | undefined = undefined;
  onmessage: ((event: any) => void) | undefined = undefined;
  eventSource: EventSource;
  constructor(
    readonly url: string,
    _protocols?: string | string[] // not supported yet
  ) {
    const parsedUrl = new URL(url);
    this.isWss = parsedUrl.protocol === 'wss:';
    this.eventSource = new EventSource(
      `${this.isWss ? 'affine-wss' : 'affine-ws'}:///open?uuid=${this.uuid}&url=${encodeURIComponent(this.url)}`
    );
    this.eventSource.addEventListener('open', () => {
      this.emitOpen(new Event('open'));
    });
    this.eventSource.addEventListener('error', () => {
      this.eventSource.close();
      this.emitError(new Event('error'));
      this.emitClose(new CloseEvent('close'));
    });
    this.eventSource.addEventListener('message', data => {
      const decodedData = JSON.parse(data.data);
      if (decodedData.type === 'message') {
        this.emitMessage(
          new MessageEvent('message', { data: decodedData.data })
        );
      }
    });
  }

  send(data: string) {
    rawFetch(
      `${this.isWss ? 'affine-wss' : 'affine-ws'}:///send?uuid=${this.uuid}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: data,
      }
    ).catch(e => {
      console.error('Failed to send message', e);
    });
  }

  close() {
    this.eventSource.close();
    this.emitClose(new CloseEvent('close'));
  }

  addEventListener(type: string, listener: (event: any) => void) {
    this.events[type] = this.events[type] || [];
    this.events[type].push(listener);
  }

  removeEventListener(type: string, listener: (event: any) => void) {
    this.events[type] = this.events[type] || [];
    this.events[type] = this.events[type].filter(l => l !== listener);
  }

  private emitOpen(event: Event) {
    this.readyState = WebSocket.OPEN;
    this.events['open']?.forEach(listener => {
      try {
        listener(event);
      } catch (e) {
        console.error(e);
      }
    });
    try {
      this.onopen?.(event);
    } catch (e) {
      console.error(e);
    }
  }

  private emitClose(event: CloseEvent) {
    this.readyState = WebSocket.CLOSED;
    this.events['close']?.forEach(listener => {
      try {
        listener(event);
      } catch (e) {
        console.error(e);
      }
    });
    try {
      this.onclose?.(event);
    } catch (e) {
      console.error(e);
    }
  }

  private emitMessage(event: MessageEvent) {
    this.events['message']?.forEach(listener => {
      try {
        listener(event);
      } catch (e) {
        console.error(e);
      }
    });
    try {
      this.onmessage?.(event);
    } catch (e) {
      console.error(e);
    }
  }

  private emitError(event: Event) {
    this.events['error']?.forEach(listener => {
      try {
        listener(event);
      } catch (e) {
        console.error(e);
      }
    });
    try {
      this.onerror?.(event);
    } catch (e) {
      console.error(e);
    }
  }
}
globalThis.WebSocket = WrappedWebSocket as any;
