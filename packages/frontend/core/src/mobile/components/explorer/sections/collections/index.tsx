import { usePromptModal } from '@affine/component';
import { createEmptyCollection } from '@affine/core/components/page-list/use-collection-manager';
import { CollectionService } from '@affine/core/modules/collection';
import { ExplorerService } from '@affine/core/modules/explorer';
import { ExplorerTreeRoot } from '@affine/core/modules/explorer/views/tree';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import { AddCollectionIcon } from '@blocksuite/icons/rc';
import { useLiveData, useServices } from '@toeverything/infra';
import { nanoid } from 'nanoid';
import { useCallback } from 'react';

import { AddItemPlaceholder } from '../../layouts/add-item-placeholder';
import { CollapsibleSection } from '../../layouts/collapsible-section';
import { ExplorerCollectionNode } from '../../nodes/collection';
import * as styles from './index.css';

export const ExplorerCollections = () => {
  const t = useI18n();
  const { collectionService, workbenchService, explorerService } = useServices({
    CollectionService,
    WorkbenchService,
    ExplorerService,
  });
  const explorerSection = explorerService.sections.collections;
  const collections = useLiveData(collectionService.collections$);
  const { openPromptModal } = usePromptModal();

  const handleCreateCollection = useCallback(() => {
    openPromptModal({
      title: t['com.affine.editCollection.saveCollection'](),
      label: t['com.affine.editCollectionName.name'](),
      inputOptions: {
        placeholder: t['com.affine.editCollectionName.name.placeholder'](),
      },
      children: (
        <div className={styles.createTips}>
          {t['com.affine.editCollectionName.createTips']()}
        </div>
      ),
      confirmText: t['com.affine.editCollection.save'](),
      cancelText: t['com.affine.editCollection.button.cancel'](),
      confirmButtonOptions: {
        variant: 'primary',
      },
      onConfirm(name) {
        const id = nanoid();
        collectionService.addCollection(createEmptyCollection(id, { name }));
        track.$.navigationPanel.organize.createOrganizeItem({
          type: 'collection',
        });
        workbenchService.workbench.openCollection(id);
        explorerSection.setCollapsed(false);
      },
    });
  }, [
    collectionService,
    explorerSection,
    openPromptModal,
    t,
    workbenchService.workbench,
  ]);

  return (
    <CollapsibleSection
      name="collections"
      testId="explorer-collections"
      title={t['com.affine.rootAppSidebar.collections']()}
    >
      <ExplorerTreeRoot>
        {collections.map(collection => (
          <ExplorerCollectionNode
            key={collection.id}
            collectionId={collection.id}
          />
        ))}
        <AddItemPlaceholder
          icon={<AddCollectionIcon />}
          data-testid="explorer-bar-add-collection-button"
          label={t['com.affine.rootAppSidebar.collection.new']()}
          onClick={() => handleCreateCollection()}
        />
      </ExplorerTreeRoot>
    </CollapsibleSection>
  );
};
