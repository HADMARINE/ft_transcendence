import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthorizationFailedException } from 'src/errors/exceptions/authorization-failed.exception';
import { ParametersInvalidException } from 'src/errors/exceptions/parameters-invalid.exception';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): TUser {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (info?.message === 'Missing credentials') {
      throw new ParametersInvalidException();
    }

    if (err) {
      throw new AuthorizationFailedException();
    }
    return super.handleRequest(err, user, info, context, status);
  }
}
