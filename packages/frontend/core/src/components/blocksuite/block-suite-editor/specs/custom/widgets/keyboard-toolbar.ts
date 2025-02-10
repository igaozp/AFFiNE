import { type KeyboardToolbarConfig } from '@blocksuite/affine/blocks';

export function createKeyboardToolbarConfig(): Partial<KeyboardToolbarConfig> {
  return {
    // TODO(@L-Sun): check android following the PR
    // https://github.com/toeverything/blocksuite/pull/8645
    useScreenHeight: BUILD_CONFIG.isIOS,
  };
}
