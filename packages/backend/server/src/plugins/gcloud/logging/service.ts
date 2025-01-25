import { LoggingWinston } from '@google-cloud/logging-winston';
import { LoggerService, Provider } from '@nestjs/common';
import { createLogger, format, transports } from 'winston';

import { AFFiNELogger as LoggerProvide } from '../../../base/logger';
import { AFFiNELogger } from './logger';

const moreMetadata = format(info => {
  info.requestId = LoggerProvide.getRequestId();
  return info;
});

export const loggerProvider: Provider<LoggerService> = {
  provide: LoggerProvide,
  useFactory: () => {
    const loggingWinston = new LoggingWinston();
    // Create a Winston logger that streams to Cloud Logging
    const instance = createLogger({
      level: 'info',
      transports: [
        new transports.Console(),
        // Add Cloud Logging
        loggingWinston,
      ],
      format: format.combine(moreMetadata(), format.json()),
    });
    return new AFFiNELogger(instance);
  },
};
