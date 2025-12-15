import { HttpStatus } from '@nestjs/common';
import { HttpExceptionFactory } from '../http-exception-factory.class';

export class AccessNotGrantedException extends HttpExceptionFactory {
  constructor() {
    super(
      {
        code: 'ACCESS_NOT_GRANTED',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
