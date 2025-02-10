import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';
export const workspaceListsWrapper = style({
  display: 'flex',
  width: '100%',
  flexDirection: 'column',
  maxHeight: 'calc(100vh - 300px)',
});
export const workspaceListWrapper = style({
  display: 'flex',
  width: '100%',
  flexDirection: 'column',
  gap: 2,
});
export const workspaceServer = style({
  display: 'flex',
  justifyContent: 'space-between',
  gap: 4,
  paddingLeft: '12px',
  marginBottom: '4px',
});

export const workspaceServerContent = style({
  display: 'flex',
  flexDirection: 'column',
  color: cssVarV2('text/secondary'),
  gap: 4,
  width: '100%',
  overflow: 'hidden',
});
export const workspaceServerName = style({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  fontWeight: 500,
  fontSize: cssVar('fontXs'),
  lineHeight: '20px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
export const account = style({
  fontSize: cssVar('fontXs'),
  overflow: 'hidden',
  width: '100%',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
export const workspaceTypeIcon = style({
  color: cssVarV2('icon/primary'),
  fontSize: '16px',
});
export const scrollbar = style({
  width: '4px',
});
export const workspaceCard = style({
  height: '44px',
  padding: '0 12px',
});

export const ItemContainer = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  padding: '8px 14px',
  gap: '14px',
  cursor: 'pointer',
  borderRadius: '8px',
  transition: 'background-color 0.2s',
  fontSize: '24px',
  color: cssVarV2('icon/secondary'),
});
export const ItemText = style({
  fontSize: cssVar('fontSm'),
  lineHeight: '22px',
  color: cssVarV2('text/secondary'),
  fontWeight: 400,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});
