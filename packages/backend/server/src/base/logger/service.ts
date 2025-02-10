import { ConsoleLogger, Injectable, type LogLevel } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';

// DO NOT use this Logger directly
// Use it via this way: `private readonly logger = new Logger(MyService.name)`
@Injectable()
export class AFFiNELogger extends ConsoleLogger {
  override stringifyMessage(message: unknown, logLevel: LogLevel) {
    const messageString = super.stringifyMessage(message, logLevel);
    const requestId = AFFiNELogger.getRequestId();
    if (!requestId) {
      return messageString;
    }
    return `<${requestId}> ${messageString}`;
  }

  static getRequestId(): string | undefined {
    return ClsServiceManager.getClsService()?.getId();
  }
}
