import { cssVar } from '@toeverything/theme';
import { style } from '@vanilla-extract/css';

export const indicatorWrapper = style({
  position: 'absolute',
  zIndex: 4,
  top: 0,
  left: '50%',
  transform: 'translateX(-50%)',
  width: '50%',
  maxWidth: 300,
  minWidth: 120,
  height: 15,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  ['WebkitAppRegion' as string]: 'no-drag',
});

export const menuTrigger = style({
  position: 'absolute',
  width: 0,
  height: 0,
  pointerEvents: 'none',
});

export const indicator = style({
  padding: '6px 20px',
  height: 15,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 3,
  cursor: 'grab',
  ['WebkitAppRegion' as string]: 'no-drag',
  color: cssVar('placeholderColor'),
  transition: 'all 0.2s',

  selectors: {
    '&:hover, &[data-active="true"], &[data-dragging="true"]': {
      color: cssVar('brandColor'),
    },
    '&[data-dragging="true"]': {
      gap: 4,
    },
  },
});

export const indicatorDot = style({
  width: 4,
  height: 4,
  borderRadius: 2,
  backgroundColor: 'currentColor',
  transition: 'all 0.2s',
  selectors: {
    [`${indicator}[data-dragging="true"] &:is([data-idx="0"], [data-idx="2"])`]:
      {
        width: 7,
      },
    [`${indicator}[data-dragging="true"] &[data-idx="1"]`]: {
      width: 6,
    },
  },
});

export const indicatorGradient = style({
  position: 'absolute',
  inset: 0,
  height: '2px',
  background:
    'linear-gradient(to right, transparent, currentColor, transparent)',
  transition: 'opacity 0.2s',
  opacity: 0,
  selectors: {
    [`${indicator}[data-dragging="true"] &, ${indicator}:hover &`]: {
      opacity: 1,
    },
  },
});
