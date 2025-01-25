import { WinstonLogger } from 'nest-winston';

export class AFFiNELogger extends WinstonLogger {
  override error(
    message: any,
    trace?: Error | string | unknown,
    context?: string
  ) {
    if (trace && trace instanceof Error) {
      super.error(message, trace.stack, context);
    } else if (typeof trace === 'string' || trace === undefined) {
      super.error(message, trace, context);
    } else {
      super.error(message, undefined, context);
    }
  }
}
