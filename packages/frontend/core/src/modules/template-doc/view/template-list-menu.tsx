import { Menu, MenuItem, type MenuProps, Scrollable } from '@affine/component';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { useI18n } from '@affine/i18n';
import { InformationIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { useState } from 'react';

import { type DocRecord } from '../../doc';
import { DocDisplayMetaService } from '../../doc-display-meta';
import { WorkbenchLink } from '../../workbench';
import { TemplateDocService } from '../services/template-doc';
import * as styles from './styles.css';
interface CommonProps {
  onSelect?: (docId: string) => void;
  asLink?: boolean;
}

interface DocItemProps extends CommonProps {
  doc: DocRecord;
}

const DocItem = ({ doc, onSelect, asLink }: DocItemProps) => {
  const docDisplayService = useService(DocDisplayMetaService);
  const Icon = useLiveData(docDisplayService.icon$(doc.id));
  const title = useLiveData(docDisplayService.title$(doc.id));

  const onClick = useAsyncCallback(async () => {
    onSelect?.(doc.id);
  }, [doc.id, onSelect]);

  const menuItem = (
    <MenuItem
      prefixIcon={<Icon />}
      onClick={onClick}
      data-testid={`template-doc-item-${doc.id}`}
    >
      {title}
    </MenuItem>
  );

  if (asLink) {
    return <WorkbenchLink to={`/${doc.id}`}>{menuItem}</WorkbenchLink>;
  }
  return menuItem;
};

const Empty = () => {
  const t = useI18n();
  return (
    <MenuItem
      disabled
      prefixIcon={<InformationIcon className={styles.emptyIcon} />}
    >
      {t['com.affine.template-list.empty']()}
    </MenuItem>
  );
};

interface TemplateListMenuContentProps extends CommonProps {
  prefixItems?: React.ReactNode;
  suffixItems?: React.ReactNode;
}
export const TemplateListMenuContent = ({
  prefixItems,
  suffixItems,
  ...props
}: TemplateListMenuContentProps) => {
  const templateDocService = useService(TemplateDocService);
  const [templateDocs] = useState(() =>
    templateDocService.list.getTemplateDocs()
  );

  return (
    <ul className={styles.list}>
      {prefixItems}
      {templateDocs.length ? (
        templateDocs.map(doc => <DocItem key={doc.id} doc={doc} {...props} />)
      ) : (
        <Empty />
      )}
      {suffixItems}
    </ul>
  );
};

export const TemplateListMenuContentScrollable = (
  props: TemplateListMenuContentProps
) => {
  return (
    <Scrollable.Root>
      <Scrollable.Scrollbar />
      <Scrollable.Viewport className={styles.scrollableViewport}>
        <TemplateListMenuContent {...props} />
      </Scrollable.Viewport>
    </Scrollable.Root>
  );
};

interface TemplateListMenuProps
  extends TemplateListMenuContentProps,
    Omit<MenuProps, 'items'> {}
export const TemplateListMenu = ({
  children,
  onSelect,
  asLink,
  prefixItems,
  suffixItems,
  contentOptions,
  ...otherProps
}: TemplateListMenuProps) => {
  return (
    <Menu
      items={
        <TemplateListMenuContentScrollable
          onSelect={onSelect}
          asLink={asLink}
          prefixItems={prefixItems}
          suffixItems={suffixItems}
        />
      }
      contentOptions={{
        ...contentOptions,
        className: styles.menuContent,
      }}
      {...otherProps}
    >
      {children}
    </Menu>
  );
};
