import { DragIndicator } from './drag-indicator';
export {
  type DropProps,
  FileDropConfigExtension,
  FileDropExtension,
  type FileDropOptions,
} from './file-drop-manager';

export { DragIndicator };

export function effects() {
  customElements.define('affine-drag-indicator', DragIndicator);
}
