import { Menu, MenuItem, type MenuProps, MenuTrigger } from '@affine/component';
import type { Server } from '@affine/core/modules/cloud';
import { useMemo } from 'react';

import { triggerStyle } from './style.css';

export const ServerSelector = ({
  servers,
  selectedSeverName,
  onSelect,
  contentOptions,
}: {
  servers: Server[];
  selectedSeverName: string;
  onSelect: (server: Server) => void;
  contentOptions?: MenuProps['contentOptions'];
}) => {
  const menuItems = useMemo(() => {
    return servers.map(server => (
      <MenuItem key={server.id} onSelect={() => onSelect(server)}>
        {server.config$.value.serverName} ({server.baseUrl})
      </MenuItem>
    ));
  }, [servers, onSelect]);

  return (
    <Menu
      items={menuItems}
      contentOptions={{
        ...contentOptions,
        style: {
          ...contentOptions?.style,
          width: 'var(--radix-dropdown-menu-trigger-width)',
        },
      }}
    >
      <MenuTrigger className={triggerStyle}>{selectedSeverName}</MenuTrigger>
    </Menu>
  );
};
