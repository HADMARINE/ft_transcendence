import { HttpStatus } from '@nestjs/common';
import { HttpExceptionFactory } from '../http-exception-factory.class';

export class AuthorizationInvalidException extends HttpExceptionFactory {
  constructor() {
    super(
      {
        code: 'AUTHORIZATION_INVALID',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
