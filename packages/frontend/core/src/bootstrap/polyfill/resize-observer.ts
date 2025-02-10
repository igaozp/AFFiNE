import { ResizeObserver } from '@juggle/resize-observer';

export function polyfillResizeObserver() {
  if (typeof window !== 'undefined') {
    window.ResizeObserver = ResizeObserver;
  }
}
