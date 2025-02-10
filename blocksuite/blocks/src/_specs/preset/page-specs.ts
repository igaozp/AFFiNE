import type { ExtensionType } from '@blocksuite/store';

import { PageRootBlockSpec } from '../../root-block/page/page-root-spec.js';
import { PageFirstPartyBlockSpecs } from '../common.js';

export const PageEditorBlockSpecs: ExtensionType[] = [
  PageRootBlockSpec,
  ...PageFirstPartyBlockSpecs,
].flat();
