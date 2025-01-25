import { EdgelessColorPickerButton } from './button.js';
import { EdgelessColorPicker } from './color-picker.js';
import { EdgelessColorCustomButton } from './custom-button.js';

export * from './button.js';
export * from './color-picker.js';
export * from './types.js';
export * from './utils.js';

export function effects() {
  customElements.define('edgeless-color-picker', EdgelessColorPicker);
  customElements.define(
    'edgeless-color-picker-button',
    EdgelessColorPickerButton
  );
  customElements.define(
    'edgeless-color-custom-button',
    EdgelessColorCustomButton
  );
}
