import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

const headerPadding = 8;
export const header = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: headerPadding,
  zIndex: 2, // should have higher z-index than the note mask
  pointerEvents: 'none',
});

export const title = style({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  flex: 1,
  color: cssVarV2('text/primary'),
  fontFamily: 'Inter',
  fontWeight: 600,
  lineHeight: '30px',
});

export const iconSize = 24;
const buttonPadding = 4;
export const button = style({
  padding: buttonPadding,
  pointerEvents: 'auto',
});

export const headerHeight = 2 * headerPadding + iconSize + 2 * buttonPadding;
