import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/users/user.entity';
import { UsersService } from 'src/users/users.service';
import { TokenPayloadEntity } from './entities/token-payload.entity';
import jwt from 'jsonwebtoken';
import { pbkdf2Sync, randomBytes } from 'crypto';
import ms, { StringValue } from 'ms';
import { JwtTokenInvalidException } from 'src/errors/exceptions/jwt-token-invalid.exception';
import { JwtTokenExpiredException } from 'src/errors/exceptions/jwt-token-expired.exception';
import { AuthorizationFailedException } from 'src/errors/exceptions/authorization-failed.exception';
import { TokenType } from './enum/token-type.enum';
import { CookieSerializeOptions } from '@fastify/cookie';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UsersService)) private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  createToken(
    payload: Record<string, any>,
    type: TokenType,
    expiration: string | number | undefined = undefined,
  ): string {
    const expireTime = ((): StringValue | number => {
      if (expiration) return expiration as StringValue | number;
      if (type === TokenType.ACCESS) {
        return this.configService.getOrThrow('ACCESS_TOKEN_EXPIRATION_TIME');
      } else {
        return '1h';
      }
    })();

    const tokenKey = ((): string => {
      switch (type) {
        case TokenType.ACCESS:
          return this.configService.getOrThrow('ACCESS_TOKEN_KEY');
        default:
          return this.configService.getOrThrow('TOKEN_KEY');
      }
    })();

    const jwtSettings: jwt.SignOptions = {
      expiresIn: expireTime,
      jwtid: `${Date.now()}_${TokenType[type]}`,
      issuer:
        this.configService.getOrThrow('NODE_ENV') === 'development'
          ? '*'
          : this.configService.getOrThrow('REQUEST_URI'),
    };

    const result = jwt.sign(
      {
        ...payload,
        type,
      },
      tokenKey,
      jwtSettings,
    );

    return result;
  }

  createAuthToken(user: User): string {
    const tokenPayload: TokenPayloadEntity = {
      user: user.id,
      authority: user.authority,
      type: TokenType.ACCESS,
    };

    const result = this.createToken(
      tokenPayload as Record<string, any>,
      TokenType.ACCESS,
    );

    return result;
  }

  verifyToken<T = Record<string, any>>(
    token: string,
    type: TokenType,
    customKey?: string,
  ): T & jwt.JwtPayload {
    const tokenValue = ((): (T & jwt.JwtPayload) | undefined => {
      try {
        let tokenKey: string;

        if (customKey) {
          tokenKey = customKey;
        } else {
          switch (type) {
            case TokenType.ACCESS:
              tokenKey = this.configService.getOrThrow('ACCESS_TOKEN_KEY');
              break;
            default:
              tokenKey = this.configService.getOrThrow('TOKEN_KEY');
              break;
          }
        }

        const result = jwt.verify(token, tokenKey);

        if (typeof result === 'string') {
          throw new JwtTokenInvalidException();
        }

        return result as unknown as T & jwt.JwtPayload;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'TokenExpiredError') {
          throw new JwtTokenExpiredException();
        }
      }
      return undefined;
    })();

    if (!tokenValue || (!tokenValue?.type && tokenValue.type !== 0)) {
      throw new JwtTokenInvalidException();
    }

    if (tokenValue.type !== type) {
      throw new JwtTokenInvalidException();
    }

    return tokenValue;
  }

  createPassword(
    password: string,
    customSalt: string | undefined = undefined,
  ): { pubkey: string; salt: string } {
    const buf: string = customSalt || randomBytes(64).toString('base64');
    const key: string = pbkdf2Sync(
      password,
      buf,
      100000,
      64,
      'sha512',
    ).toString('base64');

    return { pubkey: key, salt: buf };
  }

  verifyPassword(password: string, pubkey: string, keysalt: string): boolean {
    const key: string = pbkdf2Sync(
      password,
      keysalt,
      100000,
      64,
      'sha512',
    ).toString('base64');

    return key === pubkey;
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new AuthorizationFailedException();
    }

    if (!this.verifyPassword(password, user.pubkey, user.keysalt)) {
      throw new AuthorizationFailedException();
    }

    return user;
  }

  getCookieConfigTokenGenerationIntegrated(
    user: User,
  ): [string, string, CookieSerializeOptions?] {
    const token = this.createAuthToken(user);

    return [
      'Authorization',
      token,
      {
        httpOnly: true,
        path: '/',
        maxAge: parseInt(
          ms(this.configService.getOrThrow('ACCESS_TOKEN_EXPIRATION_TIME')),
        ),
      },
    ];
  }

  getCookieLogout(): string[] {
    return [`Authentication=; HttpOnly; Path=/; Max-Age=0`];
  }
}
