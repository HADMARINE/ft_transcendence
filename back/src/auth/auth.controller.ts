import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Throttle } from '@nestjs/throttler';
import { RequestWithUser } from './interfaces/request-with-user.interface';
import { FastifyReply } from 'fastify';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Roles } from 'src/decorators/roles.decorator';
import ms from 'ms';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 300 } })
  @Post('login')
  login(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const { user } = req;

    const cookieResult =
      this.authService.getCookieConfigTokenGenerationIntegrated(user);
    res.setCookie(...cookieResult);

    return cookieResult[1];
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: FastifyReply) {
    res.clearCookie('Authorization', {
      // httpOnly: true,
      // path: '/',
      // maxAge: parseInt(
      //   ms(this.configService.getOrThrow('ACCESS_TOKEN_EXPIRATION_TIME')),
      // ),
    });
    return 'Hello';
  }

  @Get('verify/token')
  @Roles()
  verifyToken() {
    return 'OK';
  }
}
