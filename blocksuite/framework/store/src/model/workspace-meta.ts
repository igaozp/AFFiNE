import type { Slot } from '@blocksuite/global/utils';

import type { Workspace } from './workspace.js';

export type Tag = {
  id: string;
  value: string;
  color: string;
};
export type DocsPropertiesMeta = {
  tags?: {
    options: Tag[];
  };
};
export interface DocMeta {
  id: string;
  title: string;
  tags: string[];
  createDate: number;
  updatedDate?: number;
  favorite?: boolean;
}

export interface WorkspaceMeta {
  get docMetas(): DocMeta[];

  addDocMeta(props: DocMeta, index?: number): void;
  getDocMeta(id: string): DocMeta | undefined;
  setDocMeta(id: string, props: Partial<DocMeta>): void;
  removeDocMeta(id: string): void;

  get properties(): DocsPropertiesMeta;
  setProperties(meta: DocsPropertiesMeta): void;

  get avatar(): string | undefined;
  setAvatar(avatar: string): void;

  get name(): string | undefined;
  setName(name: string): void;

  hasVersion: boolean;
  writeVersion(workspace: Workspace): void;
  get docs(): unknown[] | undefined;
  initialize(): void;

  commonFieldsUpdated: Slot;
  docMetaAdded: Slot<string>;
  docMetaRemoved: Slot<string>;
  docMetaUpdated: Slot;
}
