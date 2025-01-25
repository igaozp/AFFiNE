import { DataViewBlockComponent } from './data-view-block';
import type { DataViewBlockModel } from './data-view-model';

export function effects() {
  customElements.define('affine-data-view', DataViewBlockComponent);
}

declare global {
  namespace BlockSuite {
    interface BlockModels {
      'affine:data-view': DataViewBlockModel;
    }
  }
}
