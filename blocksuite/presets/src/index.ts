import '@blocksuite/affine-block-surface/effects';

export * from './editors';
export * from './fragments';

const env =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined'
      ? window
      : typeof global !== 'undefined'
        ? global
        : {};
const importIdentifier = '__ $BLOCKSUITE_EDITOR$ __';

// @ts-expect-error check global identifier
if (env[importIdentifier] === true) {
  // https://github.com/yjs/yjs/issues/438
  console.error(
    '@blocksuite/presets was already imported. This breaks constructor checks and will lead to issues!'
  );
}

// @ts-expect-error set global identifier
env[importIdentifier] = true;
