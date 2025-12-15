import { HttpStatus } from '@nestjs/common';
import { HttpExceptionFactory } from '../http-exception-factory.class';

export class JwtTokenExpiredException extends HttpExceptionFactory {
  constructor() {
    super(
      {
        code: 'JWT_TOKEN_EXPIRED',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}
