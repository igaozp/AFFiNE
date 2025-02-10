import { IconButton } from '@affine/component';
import { useI18n } from '@affine/i18n';
import track from '@affine/track';
import type { DocMode } from '@blocksuite/affine/blocks';
import {
  CloseIcon,
  ExpandFullIcon,
  InformationIcon,
  OpenInNewIcon,
  SplitViewIcon,
} from '@blocksuite/icons/rc';
import { useService } from '@toeverything/infra';
import { clsx } from 'clsx';
import {
  type HTMLAttributes,
  type MouseEventHandler,
  type ReactElement,
  type SVGAttributes,
  useCallback,
  useEffect,
  useMemo,
} from 'react';

import { WorkspaceDialogService } from '../../dialogs';
import { WorkbenchService } from '../../workbench';
import type {
  AttachmentPeekViewInfo,
  DocReferenceInfo,
} from '../entities/peek-view';
import { PeekViewService } from '../services/peek-view';
import * as styles from './peek-view-controls.css';

type ControlButtonProps = {
  nameKey: string;
  icon: ReactElement<SVGAttributes<SVGElement>>;
  name: string;
  onClick: () => void;
};

export const ControlButton = ({
  icon,
  nameKey,
  name,
  onClick,
}: ControlButtonProps) => {
  const handleClick: MouseEventHandler = useCallback(
    e => {
      e.stopPropagation();
      e.preventDefault();
      onClick();
    },
    [onClick]
  );

  return (
    <IconButton
      variant="solid"
      tooltip={name}
      data-testid="peek-view-control"
      data-action-name={nameKey}
      size="20"
      onClick={handleClick}
      icon={icon}
      className={styles.button}
    />
  );
};

type DocPeekViewControlsProps = HTMLAttributes<HTMLDivElement> & {
  mode?: DocMode;
  docRef: DocReferenceInfo;
};

export const DefaultPeekViewControls = ({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) => {
  const peekView = useService(PeekViewService).peekView;
  const t = useI18n();
  const controls = useMemo(() => {
    return [
      {
        icon: <CloseIcon />,
        nameKey: 'close',
        name: t['com.affine.peek-view-controls.close'](),
        onClick: () => peekView.close(),
      },
    ].filter((opt): opt is ControlButtonProps => Boolean(opt));
  }, [peekView, t]);
  return (
    <div {...rest} className={clsx(styles.root, className)}>
      {controls.map(option => (
        <ControlButton key={option.nameKey} {...option} />
      ))}
    </div>
  );
};

export const DocPeekViewControls = ({
  docRef,
  className,
  ...rest
}: DocPeekViewControlsProps) => {
  const peekView = useService(PeekViewService).peekView;
  const workbench = useService(WorkbenchService).workbench;
  const t = useI18n();
  const workspaceDialogService = useService(WorkspaceDialogService);
  const controls = useMemo(() => {
    return [
      {
        icon: <CloseIcon />,
        nameKey: 'close',
        name: t['com.affine.peek-view-controls.close'](),
        onClick: () => peekView.close(),
      },
      {
        icon: <ExpandFullIcon />,
        name: t['com.affine.peek-view-controls.open-doc'](),
        nameKey: 'open',
        onClick: () => {
          workbench.openDoc(docRef);
          peekView.close(false);
        },
      },
      {
        icon: <OpenInNewIcon />,
        nameKey: 'new-tab',
        name: t['com.affine.peek-view-controls.open-doc-in-new-tab'](),
        onClick: () => {
          workbench.openDoc(docRef, { at: 'new-tab' });
          peekView.close(false);
        },
      },
      BUILD_CONFIG.isElectron && {
        icon: <SplitViewIcon />,
        nameKey: 'split-view',
        name: t['com.affine.peek-view-controls.open-doc-in-split-view'](),
        onClick: () => {
          workbench.openDoc(docRef, { at: 'beside' });
          peekView.close(false);
        },
      },
      {
        icon: <InformationIcon />,
        nameKey: 'info',
        name: t['com.affine.peek-view-controls.open-info'](),
        onClick: () => {
          workspaceDialogService.open('doc-info', { docId: docRef.docId });
        },
      },
    ].filter((opt): opt is ControlButtonProps => Boolean(opt));
  }, [t, peekView, workbench, docRef, workspaceDialogService]);
  return (
    <div {...rest} className={clsx(styles.root, className)}>
      {controls.map(option => (
        <ControlButton key={option.nameKey} {...option} />
      ))}
    </div>
  );
};

type AttachmentPeekViewControls = HTMLAttributes<HTMLDivElement> & {
  mode?: DocMode;
  docRef: AttachmentPeekViewInfo['docRef'];
};

export const AttachmentPeekViewControls = ({
  docRef,
  className,
  ...rest
}: AttachmentPeekViewControls) => {
  const { docId, blockIds: [blockId] = [], filetype: type } = docRef;
  const peekView = useService(PeekViewService).peekView;
  const workbench = useService(WorkbenchService).workbench;
  const t = useI18n();

  const controls = useMemo(() => {
    const controls = [
      {
        icon: <CloseIcon />,
        nameKey: 'close',
        name: t['com.affine.peek-view-controls.close'](),
        onClick: () => peekView.close(),
      },
    ];
    if (!type) return controls;

    return [
      ...controls,
      // TODO(@fundon): needs to be implemented on mobile
      BUILD_CONFIG.isDesktopEdition && {
        icon: <ExpandFullIcon />,
        name: t['com.affine.peek-view-controls.open-attachment'](),
        nameKey: 'open',
        onClick: () => {
          workbench.openAttachment(docId, blockId);
          peekView.close(false);

          track.$.attachment.$.openAttachmentInFullscreen({ type });
        },
      },
      {
        icon: <OpenInNewIcon />,
        nameKey: 'new-tab',
        name: t['com.affine.peek-view-controls.open-attachment-in-new-tab'](),
        onClick: () => {
          workbench.openAttachment(docId, blockId, { at: 'new-tab' });
          peekView.close(false);

          track.$.attachment.$.openAttachmentInNewTab({ type });
        },
      },
      BUILD_CONFIG.isElectron && {
        icon: <SplitViewIcon />,
        nameKey: 'split-view',
        name: t[
          'com.affine.peek-view-controls.open-attachment-in-split-view'
        ](),
        onClick: () => {
          workbench.openAttachment(docId, blockId, { at: 'beside' });
          peekView.close(false);

          track.$.attachment.$.openAttachmentInSplitView({ type });
        },
      },
    ].filter((opt): opt is ControlButtonProps => Boolean(opt));
  }, [t, peekView, workbench, docId, blockId, type]);

  useEffect(() => {
    if (type === undefined) return;

    track.$.attachment.$.openAttachmentInPeekView({ type });
  }, [type]);

  return (
    <div {...rest} className={clsx(styles.root, className)}>
      {controls.map(option => (
        <ControlButton key={option.nameKey} {...option} />
      ))}
    </div>
  );
};
