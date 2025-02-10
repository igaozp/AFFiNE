import { IconButton } from '@affine/component';
import { useSharingUrl } from '@affine/core/components/hooks/affine/use-share-url';
import { WorkspaceDialogService } from '@affine/core/modules/dialogs';
import { DocDisplayMetaService } from '@affine/core/modules/doc-display-meta';
import { EditorService } from '@affine/core/modules/editor';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { useInsidePeekView } from '@affine/core/modules/peek-view/view/modal-container';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import { GfxControllerIdentifier } from '@blocksuite/affine/block-std/gfx';
import {
  matchFlavours,
  type NoteBlockModel,
  NoteDisplayMode,
} from '@blocksuite/affine/blocks';
import { Bound } from '@blocksuite/affine/global/utils';
import {
  ExpandFullIcon,
  InformationIcon,
  LinkIcon,
  ToggleDownIcon,
  ToggleRightIcon,
} from '@blocksuite/icons/rc';
import { useLiveData, useService, useServices } from '@toeverything/infra';
import { useCallback, useEffect, useState } from 'react';

import * as styles from './edgeless-note-header.css';

const EdgelessNoteToggleButton = ({ note }: { note: NoteBlockModel }) => {
  const t = useI18n();
  const [collapsed, setCollapsed] = useState(note.edgeless.collapse);
  const editor = useService(EditorService).editor;
  const editorContainer = useLiveData(editor.editorContainer$);
  const gfx = editorContainer?.std.get(GfxControllerIdentifier);
  const docDisplayMetaService = useService(DocDisplayMetaService);

  const Icon = useLiveData(docDisplayMetaService.icon$(note.doc.id));
  const title = useLiveData(docDisplayMetaService.title$(note.doc.id));

  useEffect(() => {
    setCollapsed(note.edgeless.collapse);
  }, [note.edgeless.collapse]);

  useEffect(() => {
    if (!gfx) return;

    const { selection } = gfx;

    const dispose = selection.slots.updated.on(() => {
      if (selection.has(note.id) && selection.editing) {
        note.doc.transact(() => {
          note.edgeless.collapse = false;
        });
      }
    });

    return () => dispose.dispose();
  }, [gfx, note]);

  const toggle = useCallback(() => {
    note.doc.transact(() => {
      if (collapsed) {
        note.edgeless.collapse = false;
      } else {
        const bound = Bound.deserialize(note.xywh);
        bound.h = styles.headerHeight * (note.edgeless.scale ?? 1);
        note.xywh = bound.serialize();
        note.edgeless.collapse = true;
        note.edgeless.collapsedHeight = styles.headerHeight;
        gfx?.selection.clear();
      }
    });
  }, [collapsed, gfx, note]);

  return (
    <>
      <IconButton
        className={styles.button}
        size={styles.iconSize}
        tooltip={t['com.affine.editor.edgeless-note-header.fold-page-block']()}
        data-testid="edgeless-note-toggle-button"
        onClick={toggle}
      >
        {collapsed ? <ToggleRightIcon /> : <ToggleDownIcon />}
      </IconButton>
      <div className={styles.title} data-testid="edgeless-note-title">
        {collapsed && (
          <>
            <Icon /> {title}
          </>
        )}
      </div>
    </>
  );
};

const ExpandFullButton = () => {
  const t = useI18n();
  const editor = useService(EditorService).editor;

  const expand = useCallback(() => {
    editor.setMode('page');
  }, [editor]);

  return (
    <IconButton
      className={styles.button}
      size={styles.iconSize}
      tooltip={t['com.affine.editor.edgeless-note-header.view-in-page']()}
      data-testid="edgeless-note-expand-button"
      onClick={expand}
    >
      <ExpandFullIcon />
    </IconButton>
  );
};

const InfoButton = ({ note }: { note: NoteBlockModel }) => {
  const t = useI18n();
  const workspaceDialogService = useService(WorkspaceDialogService);

  const onOpenInfoModal = useCallback(() => {
    track.doc.editor.pageBlockHeader.openDocInfo();
    workspaceDialogService.open('doc-info', { docId: note.doc.id });
  }, [note.doc.id, workspaceDialogService]);

  return (
    <IconButton
      className={styles.button}
      size={styles.iconSize}
      tooltip={t['com.affine.page-properties.page-info.view']()}
      data-testid="edgeless-note-info-button"
      onClick={onOpenInfoModal}
    >
      <InformationIcon />
    </IconButton>
  );
};

const LinkButton = ({ note }: { note: NoteBlockModel }) => {
  const t = useI18n();
  const { workspaceService, editorService } = useServices({
    WorkspaceService,
    EditorService,
  });

  const { onClickCopyLink } = useSharingUrl({
    workspaceId: workspaceService.workspace.id,
    pageId: editorService.editor.doc.id,
  });

  const copyLink = useCallback(() => {
    onClickCopyLink('edgeless', [note.id]);
  }, [note.id, onClickCopyLink]);

  return (
    <IconButton
      className={styles.button}
      size={styles.iconSize}
      tooltip={t['com.affine.share-menu.copy']()}
      data-testid="edgeless-note-link-button"
      onClick={copyLink}
    >
      <LinkIcon />
    </IconButton>
  );
};

export const EdgelessNoteHeader = ({ note }: { note: NoteBlockModel }) => {
  const flags = useService(FeatureFlagService).flags;
  const insidePeekView = useInsidePeekView();

  if (!flags.enable_page_block) return null;

  const isFirstVisibleNote =
    note.parent?.children.find(
      child =>
        matchFlavours(child, ['affine:note']) &&
        child.displayMode === NoteDisplayMode.DocAndEdgeless
    ) === note;

  if (!isFirstVisibleNote) return null;

  return (
    <div className={styles.header} data-testid="edgeless-page-block-header">
      <EdgelessNoteToggleButton note={note} />
      <ExpandFullButton />
      {!insidePeekView && <InfoButton note={note} />}
      <LinkButton note={note} />
    </div>
  );
};
