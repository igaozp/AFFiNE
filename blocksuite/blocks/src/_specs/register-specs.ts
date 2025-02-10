import { SpecProvider } from '@blocksuite/affine-shared/utils';

import { CommonBlockSpecs, StoreExtensions } from './common.js';
import { EdgelessEditorBlockSpecs } from './preset/edgeless-specs.js';
import { PageEditorBlockSpecs } from './preset/page-specs.js';
import {
  PreviewEdgelessEditorBlockSpecs,
  PreviewPageEditorBlockSpecs,
} from './preset/preview-specs.js';

export function registerSpecs() {
  SpecProvider.getInstance().addSpec('store', StoreExtensions);
  SpecProvider.getInstance().addSpec('common', CommonBlockSpecs);
  SpecProvider.getInstance().addSpec('page', PageEditorBlockSpecs);
  SpecProvider.getInstance().addSpec('edgeless', EdgelessEditorBlockSpecs);
  SpecProvider.getInstance().addSpec(
    'page:preview',
    PreviewPageEditorBlockSpecs
  );
  SpecProvider.getInstance().addSpec(
    'edgeless:preview',
    PreviewEdgelessEditorBlockSpecs
  );
}
