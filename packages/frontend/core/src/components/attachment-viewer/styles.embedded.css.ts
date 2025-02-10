import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const pdfContainer = style({
  width: '100%',
  borderRadius: '8px',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: cssVarV2('layer/insideBorder/border'),
  background: cssVar('--affine-background-primary-color'),
  userSelect: 'none',
  contentVisibility: 'visible',
  display: 'flex',
  minHeight: 'fit-content',
  height: '100%',
  flexDirection: 'column',
  justifyContent: 'space-between',
});

export const pdfViewer = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '12px',
  overflow: 'hidden',
  background: cssVarV2('layer/background/secondary'),
  flex: 1,
});

export const pdfPlaceholder = style({
  position: 'absolute',
  maxWidth: 'calc(100% - 24px)',
  overflow: 'hidden',
  height: 'auto',
  pointerEvents: 'none',
});

export const pdfControls = style({
  position: 'absolute',
  bottom: '16px',
  right: '14px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
});

export const pdfControlButton = style({
  width: '36px',
  height: '36px',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: cssVar('--affine-border-color'),
  background: cssVar('--affine-white'),
});

export const pdfFooter = style({
  display: 'flex',
  alignItems: 'center',
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '12px',
  textWrap: 'nowrap',
});

export const pdfFooterItem = style({
  display: 'flex',
  alignItems: 'center',
  selectors: {
    '&.truncate': {
      overflow: 'hidden',
    },
  },
});

export const pdfTitle = style({
  marginLeft: '8px',
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: '22px',
  color: cssVarV2('text/primary'),
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const pdfPageCount = style({
  fontSize: '12px',
  fontWeight: 400,
  lineHeight: '20px',
  color: cssVarV2('text/secondary'),
});
