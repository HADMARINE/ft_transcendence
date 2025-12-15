import { HttpStatus } from '@nestjs/common';
import { HttpExceptionFactory } from '../http-exception-factory.class';

export class InternalServerException extends HttpExceptionFactory {
  constructor() {
    super(
      {
        code: 'INTERNAL_SERVER_ERROR',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
