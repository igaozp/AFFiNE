import { Button, Menu } from '@affine/component';
import { DocDisplayMetaService } from '@affine/core/modules/doc-display-meta';
import { TemplateDocService } from '@affine/core/modules/template-doc';
import { TemplateListMenuContentScrollable } from '@affine/core/modules/template-doc/view/template-list-menu';
import { TemplateIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback, useMemo } from 'react';

import * as styles from './template-setting.css';

export const JournalTemplateSetting = () => {
  const templateDocService = useService(TemplateDocService);
  const docDisplayService = useService(DocDisplayMetaService);
  const journalTemplateDocId = useLiveData(
    templateDocService.setting.journalTemplateDocId$
  );

  const title = useLiveData(
    useMemo(() => {
      return journalTemplateDocId
        ? docDisplayService.title$(journalTemplateDocId)
        : null;
    }, [docDisplayService, journalTemplateDocId])
  );

  const updateJournalTemplate = useCallback(
    (templateId: string) => {
      templateDocService.setting.updateJournalTemplateDocId(templateId);
    },
    [templateDocService.setting]
  );

  return (
    <div className={styles.container}>
      <Menu
        contentOptions={{ className: styles.menu }}
        items={
          <TemplateListMenuContentScrollable onSelect={updateJournalTemplate} />
        }
      >
        <Button
          variant="plain"
          prefix={<TemplateIcon />}
          className={styles.trigger}
        >
          {title}
        </Button>
      </Menu>
    </div>
  );
};
