import type { Doc as YDoc, YEvent } from 'yjs';
import { UndoManager } from 'yjs';

import type { ProxyOptions } from './types';

export abstract class BaseReactiveYData<T, Y> {
  protected _getOrigin = (
    doc: YDoc
  ): {
    doc: YDoc;
    proxy: true;

    target: BaseReactiveYData<any, any>;
  } => {
    return {
      doc,
      proxy: true,
      target: this,
    };
  };

  protected _onObserve = (event: YEvent<any>, handler: () => void) => {
    if (
      event.transaction.origin?.proxy !== true &&
      (!event.transaction.local ||
        event.transaction.origin instanceof UndoManager)
    ) {
      handler();
    }

    this._options?.onChange?.(this._proxy);
  };

  protected abstract readonly _options?: ProxyOptions<T>;

  protected abstract readonly _proxy: T;

  protected _skipNext = false;

  protected abstract readonly _source: T;

  protected readonly _stashed = new Set<string | number>();

  protected _transact = (doc: YDoc, fn: () => void) => {
    doc.transact(fn, this._getOrigin(doc));
  };

  protected _updateWithSkip = (fn: () => void) => {
    if (this._skipNext) {
      return;
    }
    this._skipNext = true;
    fn();
    this._skipNext = false;
  };

  protected abstract readonly _ySource: Y;

  get proxy() {
    return this._proxy;
  }

  abstract pop(prop: string | number): void;
  abstract stash(prop: string | number): void;
}
