import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const container = style({
  width: '100%',
  padding: '8px 16px',
  borderTop: `0.5px solid ${cssVarV2.layer.insideBorder.border}`,
});

export const trigger = style({
  padding: '2px 4px',
  borderRadius: 4,
});

export const menu = style({
  width: 280,
});
