import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { AuthorityEnum } from '../users/enums/authority.enum';
import { User } from '../users/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  private logger = new Logger(RolesGuard.name);

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const roles = this.reflector.get<AuthorityEnum[]>(
      'roles',
      context.getHandler(),
    );

    const request = context.switchToHttp().getRequest();
    const user: User | undefined = request?.user;

    if (!user) {
      this.logger.debug(
        'Data Error : User not found while processing roles - returning false',
      );
      return false;
    }

    
    if (!roles || roles.length === 0) {
      return true;
    }

    
    for (const ua of user.authority) {
      if (roles.includes(ua)) {
        return true;
      }
    }

    return false;
  }
}
