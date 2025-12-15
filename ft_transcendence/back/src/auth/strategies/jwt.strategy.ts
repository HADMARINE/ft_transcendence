import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { UsersService } from 'src/users/users.service';
import { TokenPayloadEntity } from '../entities/token-payload.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.Authorization;
        },
      ]),
      secretOrKey: configService.getOrThrow<string>('ACCESS_TOKEN_KEY'),
    });
  }

  async validate(payload: TokenPayloadEntity) {
    return await this.usersService.findOne(payload.user);
  }
}
