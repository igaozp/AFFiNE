import { cssVar, cssVarV2 } from '@blocksuite/affine-shared/theme';
import { style } from '@vanilla-extract/css';

export const cellContainerStyle = style({
  position: 'relative',
  alignItems: 'center',
  border: '1px solid var(--affine-border-color)',
  borderCollapse: 'collapse',
  isolation: 'auto',
  textAlign: 'start',
  verticalAlign: 'top',
});

export const columnOptionsCellStyle = style({
  position: 'absolute',
  height: '0',
  top: '0',
  left: '0',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const columnOptionsStyle = style({
  cursor: 'pointer',
  zIndex: 2,
  width: '22px',
  height: '12px',
  backgroundColor: cssVarV2.table.headerBackground.default,
  borderRadius: '8px',
  boxShadow: cssVar('buttonShadow'),
  opacity: 0,
  transition: 'opacity 0.2s ease-in-out',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  selectors: {
    '&:hover': {
      opacity: 1,
    },
    '&.active': {
      opacity: 1,
      backgroundColor: cssVarV2.table.indicator.activated,
    },
  },
});

export const rowOptionsCellStyle = style({
  position: 'absolute',
  top: '0',
  left: '0',
  width: '0',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
});

export const rowOptionsStyle = style({
  cursor: 'pointer',
  zIndex: 2,
  width: '12px',
  height: '22px',
  backgroundColor: cssVarV2.table.headerBackground.default,
  borderRadius: '8px',
  boxShadow: cssVar('buttonShadow'),
  opacity: 0,
  transition: 'opacity 0.2s ease-in-out',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  selectors: {
    '&:hover': {
      opacity: 1,
    },
    '&.active': {
      opacity: 1,
      backgroundColor: cssVarV2.table.indicator.activated,
    },
  },
});

export const threePointerIconStyle = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2px',
});

export const threePointerIconDotStyle = style({
  width: '2px',
  height: '2px',
  backgroundColor: cssVarV2.icon.secondary,
  borderRadius: '50%',
});

export const widthDragHandleStyle = style({
  position: 'absolute',
  top: '-1px',
  height: 'calc(100% + 2px)',
  right: '-3px',
  width: '5px',
  backgroundColor: cssVarV2.table.indicator.activated,
  cursor: 'ew-resize',
  zIndex: 2,
  transition: 'opacity 0.2s ease-in-out',
});
