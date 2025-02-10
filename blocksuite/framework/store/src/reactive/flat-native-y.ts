import { BlockSuiteError, ErrorCode } from '@blocksuite/global/exceptions';
import { type Slot } from '@blocksuite/global/utils';
import { signal } from '@preact/signals-core';
import {
  Array as YArray,
  Map as YMap,
  Text as YText,
  type YMapEvent,
} from 'yjs';

import { SYS_KEYS } from '../consts';
import { BaseReactiveYData } from './base-reactive-data';
import { Boxed, type OnBoxedChange } from './boxed';
import { isPureObject } from './is-pure-object';
import { native2Y, y2Native } from './native-y';
import { ReactiveYArray } from './proxy';
import { type OnTextChange, Text } from './text';
import type { ProxyOptions, UnRecord } from './types';

const keyWithoutPrefix = (key: string) => key.replace(/(prop|sys):/, '');

const keyWithPrefix = (key: string) =>
  SYS_KEYS.has(key) ? `sys:${key}` : `prop:${key}`;

type OnChange = (key: string, value: unknown) => void;
type Transform = (key: string, value: unknown, origin: unknown) => unknown;

type CreateProxyOptions = {
  basePath?: string;
  onChange?: OnChange;
  transform?: Transform;
  onDispose: Slot;
  shouldByPassSignal: () => boolean;
  byPassSignalUpdate: (fn: () => void) => void;
  stashed: Set<string | number>;
  initialized: () => boolean;
};

const proxySymbol = Symbol('proxy');

function isProxy(value: unknown): boolean {
  return proxySymbol in Object.getPrototypeOf(value);
}

function markProxy(value: UnRecord): UnRecord {
  Object.setPrototypeOf(value, {
    [proxySymbol]: true,
  });
  return value;
}

function createProxy(
  yMap: YMap<unknown>,
  base: UnRecord,
  root: UnRecord,
  options: CreateProxyOptions
): UnRecord {
  const {
    onDispose,
    shouldByPassSignal,
    byPassSignalUpdate,
    basePath,
    onChange,
    initialized,
    transform = (_key, value) => value,
    stashed,
  } = options;
  const isRoot = !basePath;

  if (isProxy(base)) {
    return base;
  }

  Object.entries(base).forEach(([key, value]) => {
    if (isPureObject(value) && !isProxy(value)) {
      const proxy = createProxy(yMap, value as UnRecord, root, {
        ...options,
        basePath: basePath ? `${basePath}.${key}` : key,
      });
      base[key] = proxy;
    }
  });

  const proxy = new Proxy(base, {
    has: (target, p) => {
      return Reflect.has(target, p);
    },
    get: (target, p, receiver) => {
      return Reflect.get(target, p, receiver);
    },
    set: (target, p, value, receiver) => {
      if (typeof p === 'string') {
        const list: Array<() => void> = [];
        const fullPath = basePath ? `${basePath}.${p}` : p;
        const firstKey = fullPath.split('.')[0];
        if (!firstKey) {
          throw new Error(`Invalid key for: ${fullPath}`);
        }

        const isStashed = stashed.has(firstKey);

        const updateSignal = (value: unknown) => {
          if (shouldByPassSignal()) {
            return;
          }

          const signalKey = `${firstKey}$`;
          if (!(signalKey in root)) {
            if (!isRoot) {
              return;
            }
            const signalData = signal(value);
            root[signalKey] = signalData;
            onDispose.once(
              signalData.subscribe(next => {
                if (!initialized()) {
                  return;
                }
                byPassSignalUpdate(() => {
                  proxy[p] = next;
                  onChange?.(firstKey, next);
                });
              })
            );
            return;
          }
          byPassSignalUpdate(() => {
            const prev = root[firstKey];
            const next = isRoot
              ? value
              : isPureObject(prev)
                ? { ...prev }
                : Array.isArray(prev)
                  ? [...prev]
                  : prev;
            // @ts-expect-error allow magic props
            root[signalKey].value = next;
            onChange?.(firstKey, next);
          });
        };

        if (isPureObject(value)) {
          const syncYMap = () => {
            yMap.forEach((_, key) => {
              if (initialized() && keyWithoutPrefix(key).startsWith(fullPath)) {
                yMap.delete(key);
              }
            });
            const run = (obj: object, basePath: string) => {
              Object.entries(obj).forEach(([key, value]) => {
                const fullPath = basePath ? `${basePath}.${key}` : key;
                if (isPureObject(value)) {
                  run(value, fullPath);
                } else {
                  list.push(() => {
                    yMap.set(keyWithPrefix(fullPath), native2Y(value));
                  });
                }
              });
            };
            run(value, fullPath);
            if (list.length && initialized()) {
              yMap.doc?.transact(
                () => {
                  list.forEach(fn => fn());
                },
                { proxy: true }
              );
            }
          };

          if (!isStashed) {
            syncYMap();
          }

          const next = createProxy(yMap, value as UnRecord, root, {
            ...options,
            basePath: fullPath,
          });

          const result = Reflect.set(target, p, next, receiver);
          updateSignal(next);
          return result;
        }

        const yValue = native2Y(value);
        const next = transform(firstKey, value, yValue);
        if (!isStashed && initialized()) {
          yMap.doc?.transact(
            () => {
              yMap.set(keyWithPrefix(fullPath), yValue);
            },
            { proxy: true }
          );
        }

        const result = Reflect.set(target, p, next, receiver);
        updateSignal(next);
        return result;
      }
      return Reflect.set(target, p, value, receiver);
    },
    deleteProperty: (target, p) => {
      if (typeof p === 'string') {
        const fullPath = basePath ? `${basePath}.${p}` : p;
        const firstKey = fullPath.split('.')[0];
        if (!firstKey) {
          throw new Error(`Invalid key for: ${fullPath}`);
        }

        const isStashed = stashed.has(firstKey);

        const updateSignal = () => {
          if (shouldByPassSignal()) {
            return;
          }

          const signalKey = `${firstKey}$`;
          if (!(signalKey in root)) {
            if (!isRoot) {
              return;
            }
            delete root[signalKey];
            return;
          }
          byPassSignalUpdate(() => {
            const prev = root[firstKey];
            const next = isRoot
              ? prev
              : isPureObject(prev)
                ? { ...prev }
                : Array.isArray(prev)
                  ? [...prev]
                  : prev;
            // @ts-expect-error allow magic props
            root[signalKey].value = next;
            onChange?.(firstKey, next);
          });
        };

        if (!isStashed && initialized()) {
          yMap.doc?.transact(
            () => {
              const fullKey = keyWithPrefix(fullPath);
              yMap.forEach((_, key) => {
                if (key.startsWith(fullKey)) {
                  yMap.delete(key);
                }
              });
            },
            { proxy: true }
          );
        }

        const result = Reflect.deleteProperty(target, p);
        updateSignal();
        return result;
      }
      return Reflect.deleteProperty(target, p);
    },
  });

  markProxy(proxy);

  return proxy;
}

export class ReactiveFlatYMap extends BaseReactiveYData<
  UnRecord,
  YMap<unknown>
> {
  protected readonly _proxy: UnRecord;
  protected readonly _source: UnRecord;
  protected readonly _options?: ProxyOptions<UnRecord>;

  private readonly _initialized;

  private readonly _observer = (event: YMapEvent<unknown>) => {
    const yMap = this._ySource;
    const proxy = this._proxy;
    this._onObserve(event, () => {
      event.keysChanged.forEach(key => {
        const type = event.changes.keys.get(key);
        if (!type) {
          return;
        }
        if (type.action === 'update' || type.action === 'add') {
          const value = yMap.get(key);
          const keyName: string = keyWithoutPrefix(key);
          const keys = keyName.split('.');
          const firstKey = keys[0];
          if (this._stashed.has(firstKey)) {
            return;
          }
          void keys.reduce((acc, key, index, arr) => {
            if (index === arr.length - 1) {
              acc[key] = y2Native(value);
            }
            return acc[key] as UnRecord;
          }, proxy as UnRecord);
          return;
        }
        if (type.action === 'delete') {
          const keyName: string = keyWithoutPrefix(key);
          const keys = keyName.split('.');
          const firstKey = keys[0];
          if (this._stashed.has(firstKey)) {
            return;
          }
          void keys.reduce((acc, key, index, arr) => {
            if (index === arr.length - 1) {
              delete acc[key];
            }
            return acc[key] as UnRecord;
          }, proxy as UnRecord);
          return;
        }
      });
    });
  };

  private readonly _transform = (
    key: string,
    value: unknown,
    origin: unknown
  ) => {
    const onChange = this._getPropOnChange(key);
    if (value instanceof Text) {
      value.bind(onChange as OnTextChange);
      return value;
    }
    if (Boxed.is(origin)) {
      (value as Boxed).bind(onChange as OnBoxedChange);
      return value;
    }
    if (origin instanceof YArray) {
      const data = new ReactiveYArray(value as unknown[], origin, {
        onChange,
      });
      return data.proxy;
    }

    return value;
  };

  private readonly _getPropOnChange = (key: string) => {
    return () => {
      const value = this._proxy[key];
      this._onChange?.(key, value);
    };
  };

  private readonly _createDefaultData = (): UnRecord => {
    const root: UnRecord = {};
    const transform = this._transform;
    Array.from(this._ySource.entries()).forEach(([key, value]) => {
      if (key.startsWith('sys')) {
        return;
      }
      const keys = keyWithoutPrefix(key).split('.');
      const firstKey = keys[0];

      let finalData = value;
      if (Boxed.is(value)) {
        finalData = transform(firstKey, new Boxed(value), value);
      } else if (value instanceof YArray) {
        finalData = transform(firstKey, value.toArray(), value);
      } else if (value instanceof YText) {
        const next = new Text(value);
        finalData = transform(firstKey, next, value);
      } else if (value instanceof YMap) {
        throw new BlockSuiteError(
          ErrorCode.ReactiveProxyError,
          'flatY2Native does not support Y.Map as value of Y.Map'
        );
      } else {
        finalData = transform(firstKey, value, value);
      }
      const allLength = keys.length;
      void keys.reduce((acc: UnRecord, key, index) => {
        if (!acc[key] && index !== allLength - 1) {
          const path = keys.slice(0, index + 1).join('.');
          const data = this._getProxy({} as UnRecord, root, path);
          acc[key] = data;
        }
        if (index === allLength - 1) {
          acc[key] = finalData;
        }
        return acc[key] as UnRecord;
      }, root);
    });

    return root;
  };

  private readonly _getProxy = (
    source: UnRecord,
    root: UnRecord,
    path?: string
  ): UnRecord => {
    return createProxy(this._ySource, source, root, {
      onDispose: this._onDispose,
      shouldByPassSignal: () => this._skipNext,
      byPassSignalUpdate: this._updateWithSkip,
      basePath: path,
      onChange: this._onChange,
      transform: this._transform,
      stashed: this._stashed,
      initialized: () => this._initialized,
    });
  };

  constructor(
    protected readonly _ySource: YMap<unknown>,
    private readonly _onDispose: Slot,
    private readonly _onChange?: OnChange
  ) {
    super();
    this._initialized = false;
    const source = this._createDefaultData();
    this._source = source;

    const proxy = this._getProxy(source, source);

    Object.entries(source).forEach(([key, value]) => {
      const signalData = signal(value);
      source[`${key}$`] = signalData;
      _onDispose.once(
        signalData.subscribe(next => {
          if (!this._initialized) {
            return;
          }
          this._updateWithSkip(() => {
            proxy[key] = next;
            this._onChange?.(key, next);
          });
        })
      );
    });

    this._proxy = proxy;
    this._ySource.observe(this._observer);
    this._initialized = true;
  }

  pop = (prop: string): void => {
    const value = this._source[prop];
    this._stashed.delete(prop);
    this._proxy[prop] = value;
  };

  stash = (prop: string): void => {
    this._stashed.add(prop);
  };
}
