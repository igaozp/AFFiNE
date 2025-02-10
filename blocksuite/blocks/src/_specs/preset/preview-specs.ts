import type { ExtensionType } from '@blocksuite/store';

import { PreviewEdgelessRootBlockSpec } from '../../root-block/edgeless/edgeless-root-spec.js';
import { PreviewPageRootBlockSpec } from '../../root-block/page/page-root-spec.js';
import {
  EdgelessFirstPartyBlockSpecs,
  PageFirstPartyBlockSpecs,
} from '../common.js';

export const PreviewEdgelessEditorBlockSpecs: ExtensionType[] = [
  PreviewEdgelessRootBlockSpec,
  EdgelessFirstPartyBlockSpecs,
].flat();

export const PreviewPageEditorBlockSpecs: ExtensionType[] = [
  PreviewPageRootBlockSpec,
  PageFirstPartyBlockSpecs,
].flat();
