import { createIdentifier } from '@toeverything/infra';

export type VirtualKeyboardEvent =
  | 'keyboardWillShow'
  | 'keyboardDidShow'
  | 'keyboardWillHide'
  | 'keyboardDidHide';

export interface VirtualKeyboardEventInfo {
  keyboardHeight: number;
}
type VirtualKeyboardEventListener = (info: VirtualKeyboardEventInfo) => void;

export interface VirtualKeyboardProvider {
  addEventListener: (
    event: VirtualKeyboardEvent,
    callback: VirtualKeyboardEventListener
  ) => void;
  removeAllListeners: () => void;
}

export const VirtualKeyboardProvider =
  createIdentifier<VirtualKeyboardProvider>('VirtualKeyboardProvider');
