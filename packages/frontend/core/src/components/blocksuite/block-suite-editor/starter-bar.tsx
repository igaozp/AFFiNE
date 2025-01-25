import { handleInlineAskAIAction } from '@affine/core/blocksuite/presets/ai';
import { pageAIGroups } from '@affine/core/blocksuite/presets/ai/_common/config';
import { DocsService } from '@affine/core/modules/doc';
import { EditorService } from '@affine/core/modules/editor';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { TemplateDocService } from '@affine/core/modules/template-doc';
import { TemplateListMenu } from '@affine/core/modules/template-doc/view/template-list-menu';
import { useI18n } from '@affine/i18n';
import track from '@affine/track';
import { PageRootBlockComponent } from '@blocksuite/affine/blocks';
import type { Store } from '@blocksuite/affine/store';
import {
  AiIcon,
  EdgelessIcon,
  TemplateColoredIcon,
} from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import clsx from 'clsx';
import {
  forwardRef,
  type HTMLAttributes,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAsyncCallback } from '../../hooks/affine-async-hooks';
import * as styles from './starter-bar.css';

const Badge = forwardRef<
  HTMLLIElement,
  HTMLAttributes<HTMLLIElement> & {
    icon: React.ReactNode;
    text: string;
    active?: boolean;
  }
>(function Badge({ icon, text, className, active, ...attrs }, ref) {
  return (
    <li
      data-active={active}
      className={clsx(styles.badge, className)}
      ref={ref}
      {...attrs}
    >
      <span className={styles.badgeText}>{text}</span>
      <span className={styles.badgeIcon}>{icon}</span>
    </li>
  );
});

const StarterBarNotEmpty = ({ doc }: { doc: Store }) => {
  const t = useI18n();

  const templateDocService = useService(TemplateDocService);
  const featureFlagService = useService(FeatureFlagService);
  const docsService = useService(DocsService);
  const editorService = useService(EditorService);

  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);

  const isTemplate = useLiveData(
    useMemo(
      () => templateDocService.list.isTemplate$(doc.id),
      [doc.id, templateDocService.list]
    )
  );
  const enableAI = useLiveData(featureFlagService.flags.enable_ai.$);
  const enableTemplateDoc = useLiveData(
    featureFlagService.flags.enable_template_doc.$
  );

  const handleSelectTemplate = useAsyncCallback(
    async (templateId: string) => {
      await docsService.duplicateFromTemplate(templateId, doc.id);
      track.doc.editor.starterBar.quickStart({ with: 'template' });
    },
    [doc.id, docsService]
  );

  const startWithEdgeless = useCallback(() => {
    const record = docsService.list.doc$(doc.id).value;
    record?.setPrimaryMode('edgeless');
    editorService.editor.setMode('edgeless');
  }, [doc.id, docsService.list, editorService.editor]);

  const onTemplateMenuOpenChange = useCallback((open: boolean) => {
    if (open) track.doc.editor.starterBar.openTemplateListMenu();
    setTemplateMenuOpen(open);
  }, []);

  const startWithAI = useCallback(() => {
    const std = editorService.editor.editorContainer$.value?.std;
    if (!std) return;

    const rootBlockId = std.host.doc.root?.id;
    if (!rootBlockId) return;

    const rootComponent = std.view.getBlock(rootBlockId);
    if (!(rootComponent instanceof PageRootBlockComponent)) return;

    const { id, created } = rootComponent.focusFirstParagraph();
    if (created) {
      std.view.viewUpdated.once(v => {
        if (v.id === id) handleInlineAskAIAction(std.host, pageAIGroups);
      });
    } else {
      handleInlineAskAIAction(std.host, pageAIGroups);
    }
  }, [editorService.editor]);

  const showTemplate = !isTemplate && enableTemplateDoc;

  if (!enableAI && !showTemplate) {
    return null;
  }

  return (
    <div className={styles.root}>
      {t['com.affine.page-starter-bar.start']()}
      <ul className={styles.badges}>
        {enableAI ? (
          <Badge
            data-testid="start-with-ai-badge"
            icon={<AiIcon />}
            text={t['com.affine.page-starter-bar.ai']()}
            onClick={startWithAI}
          />
        ) : null}

        {showTemplate ? (
          <TemplateListMenu
            onSelect={handleSelectTemplate}
            rootOptions={{
              open: templateMenuOpen,
              onOpenChange: onTemplateMenuOpenChange,
            }}
          >
            <Badge
              data-testid="template-docs-badge"
              icon={<TemplateColoredIcon />}
              text={t['com.affine.page-starter-bar.template']()}
              active={templateMenuOpen}
            />
          </TemplateListMenu>
        ) : null}

        <Badge
          icon={<EdgelessIcon />}
          text={t['com.affine.page-starter-bar.edgeless']()}
          onClick={startWithEdgeless}
        />
      </ul>
    </div>
  );
};

export const StarterBar = ({ doc }: { doc: Store }) => {
  const [isEmpty, setIsEmpty] = useState(doc.isEmpty);

  useEffect(() => {
    const disposable = doc.slots.blockUpdated.on(() => {
      setIsEmpty(doc.isEmpty);
    });
    return () => {
      disposable.dispose();
    };
  }, [doc]);

  if (!isEmpty) return null;

  return <StarterBarNotEmpty doc={doc} />;
};
