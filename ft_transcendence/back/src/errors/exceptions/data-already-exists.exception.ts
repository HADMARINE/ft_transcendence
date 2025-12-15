import { HttpStatus } from '@nestjs/common';
import { HttpExceptionFactory } from '../http-exception-factory.class';

export class DataAlreadyExistsException extends HttpExceptionFactory {
  constructor(props?: { name?: string }) {
    super(
      {
        code: 'DATA_ALREADY_EXISTS',
        exceptionFilter: {
          args: { name: props?.name || '[UNDEFINED]' },
        },
      },
      HttpStatus.CONFLICT,
    );
  }
}
