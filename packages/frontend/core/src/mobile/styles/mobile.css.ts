import { cssVarV2 } from '@toeverything/theme/v2';
import { createVar, globalStyle } from '@vanilla-extract/css';

export const globalVars = {
  appTabHeight: createVar('appTabHeight'),
  appTabSafeArea: createVar('appTabSafeArea'),
};

globalStyle(':root', {
  vars: {
    [globalVars.appTabHeight]: BUILD_CONFIG.isIOS ? '49px' : '62px',
    [globalVars.appTabSafeArea]: `calc(${globalVars.appTabHeight} + env(safe-area-inset-bottom))`,
  },
  userSelect: 'none',
  WebkitUserSelect: 'none',
});

globalStyle('body', {
  height: 'auto',
  minHeight: '100dvh',
  overflowY: 'unset',
});
globalStyle('body:has(> #app-tabs)', {
  paddingBottom: globalVars.appTabSafeArea,
});
globalStyle('body:has(#app-tabs) affine-keyboard-toolbar[data-shrink="true"]', {
  paddingBottom: globalVars.appTabSafeArea,
});
globalStyle('body:has(#app-tabs) affine-keyboard-tool-panel', {
  paddingBottom: `calc(${globalVars.appTabHeight} + env(safe-area-inset-bottom) + 8px)`,
});
globalStyle('body:has(#app-tabs) edgeless-toolbar-widget', {
  bottom: globalVars.appTabSafeArea,
});
globalStyle('html', {
  height: '100dvh',
  overflowY: 'auto',
  background: cssVarV2('layer/background/secondary'),
});

globalStyle('a:focus', {
  outline: 'none',
});
globalStyle('button:focus', {
  outline: 'none',
});
