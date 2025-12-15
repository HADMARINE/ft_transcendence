import { HttpStatus } from '@nestjs/common';
import { HttpExceptionFactory } from '../http-exception-factory.class';

export class DatabaseExecutionException extends HttpExceptionFactory {
  constructor(props?: { action?: string; database?: string }) {
    super(
      {
        code: 'DATABASE_EXECUTION',
        exceptionFilter: {
          args: {
            action: props?.action || '[UNDEFINED]',
            database: props?.database || '[UNDEFINED]',
          },
        },
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
