import { cssVar } from '@toeverything/theme';
import { style } from '@vanilla-extract/css';

export const menuTriggerStyle = style({
  padding: '4px 10px',
  borderRadius: '4px',
  justifyContent: 'space-between',
  display: 'flex',
  fontSize: cssVar('fontSm'),
  fontWeight: 400,
});

export const rowContainerStyle = style({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '4px',
});
export const exportContainerStyle = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
});
export const labelStyle = style({
  fontSize: cssVar('fontSm'),
  fontWeight: 500,
});
export const publicItemRowStyle = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});
export const tagContainerStyle = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
});
