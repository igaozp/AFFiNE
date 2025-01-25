import { app } from 'electron';

import { logger } from './logger';

const cleanupRegistry: (() => void)[] = [];

export function beforeAppQuit(fn: () => void) {
  cleanupRegistry.push(fn);
}

app.on('before-quit', () => {
  cleanupRegistry.forEach(fn => {
    // some cleanup functions might throw on quit and crash the app
    try {
      fn();
    } catch (err) {
      logger.warn('cleanup error on quit', err);
    }
  });
});
