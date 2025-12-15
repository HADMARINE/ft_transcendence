import { HttpStatus } from '@nestjs/common';
import { HttpExceptionFactory } from '../http-exception-factory.class';

export class TooManyRequestsException extends HttpExceptionFactory {
  constructor() {
    super(
      {
        code: 'TOO_MANY_REQUESTS',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
