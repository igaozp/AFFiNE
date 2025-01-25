import { MenuItem } from '@affine/component/ui/menu';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { useI18n } from '@affine/i18n';
import { PlusIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';

import * as styles from './index.css';

export const AddServer = ({ onAddServer }: { onAddServer?: () => void }) => {
  const t = useI18n();
  const featureFlagService = useService(FeatureFlagService);
  const enableMultipleServer = useLiveData(
    featureFlagService.flags.enable_multiple_cloud_servers.$
  );

  if (!enableMultipleServer) {
    return null;
  }
  return (
    <div>
      <MenuItem
        block={true}
        prefixIcon={<PlusIcon />}
        onClick={onAddServer}
        data-testid="new-server"
        className={styles.ItemContainer}
      >
        <div className={styles.ItemText}>
          {t['com.affine.workspaceList.addServer']()}
        </div>
      </MenuItem>
    </div>
  );
};
