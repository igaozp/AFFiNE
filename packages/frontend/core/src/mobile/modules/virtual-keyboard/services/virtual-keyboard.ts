import { LiveData, Service } from '@toeverything/infra';

import type { VirtualKeyboardProvider } from '../providers/virtual-keyboard';

export class VirtualKeyboardService extends Service {
  show$ = new LiveData(false);
  height$ = new LiveData(0);

  constructor(
    private readonly virtualKeyboardProvider?: VirtualKeyboardProvider
  ) {
    super();
    this._observe();
  }

  override dispose() {
    super.dispose();
    this.virtualKeyboardProvider?.removeAllListeners();
  }

  private _observe() {
    this.virtualKeyboardProvider?.addEventListener(
      'keyboardWillShow',
      ({ keyboardHeight }) => {
        this.show$.next(true);
        this.height$.next(keyboardHeight);
      }
    );
    this.virtualKeyboardProvider?.addEventListener('keyboardWillHide', () => {
      this.show$.next(false);
      this.height$.next(0);
    });
  }
}
