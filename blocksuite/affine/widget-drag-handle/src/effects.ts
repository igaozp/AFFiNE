import { DropIndicator } from './components/drop-indicator';
import { AFFINE_DRAG_HANDLE_WIDGET } from './consts';
import { AffineDragHandleWidget } from './drag-handle';

export function effects() {
  customElements.define('affine-drop-indicator', DropIndicator);
  customElements.define(AFFINE_DRAG_HANDLE_WIDGET, AffineDragHandleWidget);
}
