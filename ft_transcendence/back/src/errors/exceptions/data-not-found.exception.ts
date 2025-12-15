import { HttpStatus } from '@nestjs/common';
import { HttpExceptionFactory } from '../http-exception-factory.class';

export class DataNotFoundException extends HttpExceptionFactory {
  constructor(props?: { name?: string }) {
    super(
      {
        code: 'DATA_NOT_FOUND',
        exceptionFilter: {
          args: { name: props?.name || '[UNDEFINED]' },
        },
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
