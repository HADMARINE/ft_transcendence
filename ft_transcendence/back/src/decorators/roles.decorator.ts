import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiCookieAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { AuthorityEnum } from 'src/users/enums/authority.enum';

export const Roles = (...roles: AuthorityEnum[]) => {
  return applyDecorators(
    SetMetadata('roles', roles),
    SetMetadata('jwtForceVerify', true),
    UseGuards(JwtAuthGuard, RolesGuard),
    ApiCookieAuth('Authorization'),
  );
};
