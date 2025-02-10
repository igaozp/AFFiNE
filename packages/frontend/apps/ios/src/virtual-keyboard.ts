import type { PluginListenerHandle } from '@capacitor/core/types/definitions';
import { Keyboard } from '@capacitor/keyboard';

type VirtualKeyboardCallback =
  | (<K extends keyof VirtualKeyboardEventMap>(
      this: VirtualKeyboard,
      ev: VirtualKeyboardEventMap[K]
    ) => any)
  | EventListenerOrEventListenerObject;

class NavigatorVirtualKeyboard implements VirtualKeyboard {
  private readonly _boundingRect = new DOMRect();

  private readonly _overlaysContent = false;

  private readonly _listeners = new Map<
    string,
    Set<{
      cb: VirtualKeyboardCallback;
      options?: boolean | AddEventListenerOptions;
    }>
  >();

  private _capacitorListenerHandles: PluginListenerHandle[] = [];

  private async _bindListener() {
    const updateBoundingRect = (info?: { keyboardHeight: number }) => {
      this.boundingRect.x = 0;
      this.boundingRect.y = info ? window.innerHeight - info.keyboardHeight : 0;
      this.boundingRect.width = window.innerWidth;
      this.boundingRect.height = info ? info.keyboardHeight : 0;
      this.dispatchEvent(new Event('geometrychange'));
    };

    this._capacitorListenerHandles = [
      await Keyboard.addListener('keyboardDidShow', updateBoundingRect),
      await Keyboard.addListener('keyboardDidHide', updateBoundingRect),
    ];
  }

  dispatchEvent = (event: Event) => {
    const listeners = this._listeners.get(event.type);
    if (listeners) {
      for (const l of listeners) {
        if (typeof l.cb === 'function') {
          l.cb.call(this, event);
        } else {
          l.cb.handleEvent(event);
        }
      }
    }
    return !(event.cancelable && event.defaultPrevented);
  };

  constructor() {
    this._bindListener().catch(e => {
      console.error(e);
    });
  }

  destroy() {
    this._capacitorListenerHandles.forEach(handle => {
      handle.remove().catch(e => {
        console.error(e);
      });
    });
  }

  get boundingRect(): DOMRect {
    return this._boundingRect;
  }

  get overlaysContent(): boolean {
    return this._overlaysContent;
  }

  set overlaysContent(_: boolean) {
    console.warn(
      'overlaysContent is read-only in polyfill based on @capacitor/keyboard'
    );
  }

  hide() {
    Keyboard.hide().catch(e => {
      console.error(e);
    });
  }

  show() {
    Keyboard.show().catch(e => {
      console.error(e);
    });
  }

  ongeometrychange: ((this: VirtualKeyboard, ev: Event) => any) | null = null;

  addEventListener<K extends keyof VirtualKeyboardEventMap>(
    type: K,
    listener: VirtualKeyboardCallback,
    options?: boolean | AddEventListenerOptions
  ) {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, new Set());
    }

    const listeners = this._listeners.get(type);
    if (!listeners) return;

    listeners.add({ cb: listener, options });
  }

  removeEventListener<K extends keyof VirtualKeyboardEventMap>(
    type: K,
    listener: VirtualKeyboardCallback,
    options?: boolean | EventListenerOptions
  ) {
    const listeners = this._listeners.get(type);
    if (!listeners) return;

    const sameCapture = (
      a?: boolean | AddEventListenerOptions,
      b?: boolean | EventListenerOptions
    ) => {
      if (a === undefined && b === undefined) {
        return true;
      }

      if (typeof a === 'boolean' && typeof b === 'boolean') {
        return a === b;
      }

      if (typeof a === 'object' && typeof b === 'object') {
        return a.capture === b.capture;
      }

      if (typeof a === 'object' && typeof b === 'boolean') {
        return a.capture === b;
      }

      if (typeof a === 'boolean' && typeof b === 'object') {
        return a === b.capture;
      }

      return false;
    };

    let target = null;
    for (const l of listeners) {
      if (l.cb === listener && sameCapture(l.options, options)) {
        target = l;
        break;
      }
    }

    if (target) {
      listeners.delete(target);
    }
  }
}

// @ts-expect-error polyfill
navigator.virtualKeyboard = new NavigatorVirtualKeyboard();
