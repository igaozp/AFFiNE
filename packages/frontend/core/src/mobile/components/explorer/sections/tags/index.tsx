import { ExplorerService } from '@affine/core/modules/explorer';
import { ExplorerTreeRoot } from '@affine/core/modules/explorer/views/tree';
import { TagService } from '@affine/core/modules/tag';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import { AddTagIcon } from '@blocksuite/icons/rc';
import { useLiveData, useServices } from '@toeverything/infra';
import { useCallback, useState } from 'react';

import { AddItemPlaceholder } from '../../layouts/add-item-placeholder';
import { CollapsibleSection } from '../../layouts/collapsible-section';
import { ExplorerTagNode } from '../../nodes/tag';
import { TagRenameDialog } from '../../nodes/tag/dialog';

export const TagDesc = ({ input }: { input: string }) => {
  const t = useI18n();

  return input
    ? t['com.affine.m.explorer.tag.new-tip-not-empty']({ value: input })
    : t['com.affine.m.explorer.tag.new-tip-empty']();
};

export const ExplorerTags = () => {
  const { tagService, explorerService } = useServices({
    TagService,
    ExplorerService,
  });
  const explorerSection = explorerService.sections.tags;
  const tags = useLiveData(tagService.tagList.tags$);
  const [showNewTagDialog, setShowNewTagDialog] = useState(false);

  const t = useI18n();

  const handleNewTag = useCallback(
    (name: string, color: string) => {
      setShowNewTagDialog(false);
      tagService.tagList.createTag(name, color);
      track.$.navigationPanel.organize.createOrganizeItem({ type: 'tag' });
      explorerSection.setCollapsed(false);
    },
    [explorerSection, tagService]
  );

  return (
    <CollapsibleSection
      name="tags"
      title={t['com.affine.rootAppSidebar.tags']()}
    >
      <ExplorerTreeRoot>
        {tags.map(tag => (
          <ExplorerTagNode key={tag.id} tagId={tag.id} />
        ))}
        <AddItemPlaceholder
          icon={<AddTagIcon />}
          data-testid="explorer-add-tag-button"
          onClick={() => setShowNewTagDialog(true)}
          label={t[
            'com.affine.rootAppSidebar.explorer.tag-section-add-tooltip'
          ]()}
        />
        <TagRenameDialog
          open={showNewTagDialog}
          onOpenChange={setShowNewTagDialog}
          onConfirm={handleNewTag}
          enableAnimation
          descRenderer={TagDesc}
        />
      </ExplorerTreeRoot>
    </CollapsibleSection>
  );
};
